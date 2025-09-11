/**
 * TDD London School: Content Authenticity Verification Tests
 * 
 * Verifies that ALL content displayed in UnifiedAgentPage is authentic
 * and traceable back to real API responses. No synthetic or generated content.
 * 
 * London School Focus:
 * - Mock API as collaborator to control data flow
 * - Verify component behavior produces only authentic content
 * - Test content contracts and data transformation behavior
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import * as fs from 'fs';

// Mock router collaborator
const mockNavigate = jest.fn();
const mockParams = { agentId: 'authenticity-test-agent' };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockParams,
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>
}));

// Import component after mocks
import UnifiedAgentPage from '../../frontend/src/components/UnifiedAgentPage';

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// Content authenticity analyzer
class ContentAuthenticityAnalyzer {
  private authenticityPatterns = {
    // Patterns that indicate synthetic/fake content
    synthetic: [
      /generated|synthetic|fake|mock|demo/i,
      /lorem ipsum/i,
      /placeholder/i,
      /test.*data/i,
      /sample.*content/i
    ],
    
    // Patterns that indicate hardcoded values
    hardcoded: [
      /exactly \d+ (minutes?|hours?|days?) ago/,
      /Achievement: .* tasks completed/,
      /Milestone: .* reached/,
      /Performance boost detected/,
      /Data analysis complete/,
      /System optimization/
    ],
    
    // Patterns for random-looking data
    randomLike: [
      /\d{1,2}\.\d{2}% success/, // Suspiciously precise percentages
      /\d{1,2} minutes? ago$/, // Round time intervals
      /(very|extremely|highly) (active|productive|efficient)/, // Marketing language
      /(\d+)K tasks completed/ // Round thousands
    ],
    
    // Patterns for Math.random usage in code
    mathRandom: [
      /Math\.random\(\)/,
      /Math\.floor\(Math\.random\(/,
      /Math\.round\(Math\.random\(/,
      /random\(\)\s*\*/,
      /\*\s*Math\.random\(\)/
    ]
  };

  analyzeContent(content: string): {
    synthetic: string[];
    hardcoded: string[];
    randomLike: string[];
    authentic: boolean;
  } {
    const results = {
      synthetic: [] as string[],
      hardcoded: [] as string[],
      randomLike: [] as string[],
      authentic: true
    };

    // Check for synthetic patterns
    this.authenticityPatterns.synthetic.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        results.synthetic.push(matches[0]);
        results.authentic = false;
      }
    });

    // Check for hardcoded patterns
    this.authenticityPatterns.hardcoded.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        results.hardcoded.push(matches[0]);
        results.authentic = false;
      }
    });

    // Check for random-like patterns
    this.authenticityPatterns.randomLike.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        results.randomLike.push(matches[0]);
      }
    });

    return results;
  }

  analyzeSourceCode(filePath: string): {
    mathRandomUsage: string[];
    generateFunctions: string[];
    mockDataReferences: string[];
    codeAuthentic: boolean;
  } {
    const sourceCode = fs.readFileSync(filePath, 'utf8');
    const results = {
      mathRandomUsage: [] as string[],
      generateFunctions: [] as string[],
      mockDataReferences: [] as string[],
      codeAuthentic: true
    };

    // Check for Math.random usage
    this.authenticityPatterns.mathRandom.forEach(pattern => {
      const matches = sourceCode.match(new RegExp(pattern.source, 'g'));
      if (matches) {
        results.mathRandomUsage.push(...matches);
        results.codeAuthentic = false;
      }
    });

    // Check for generate functions
    const generateFunctionPattern = /generate\w*(Activities|Posts|Data|Content)\w*/gi;
    const generateMatches = sourceCode.match(generateFunctionPattern);
    if (generateMatches) {
      results.generateFunctions.push(...generateMatches);
    }

    // Check for mock data references
    const mockDataPattern = /(mock|fake|synthetic|generated).*data/gi;
    const mockMatches = sourceCode.match(mockDataPattern);
    if (mockMatches) {
      results.mockDataReferences.push(...mockMatches);
    }

    return results;
  }
}

// API data for authenticity testing
interface AuthenticApiData {
  id: string;
  name: string;
  display_name?: string;
  description: string;
  status: string;
  capabilities: string[];
  performance_metrics?: {
    success_rate: number;
    average_response_time: number;
    total_tokens_used: number;
    error_count: number;
  };
  health_status?: {
    cpu_usage: number;
    memory_usage: number;
    response_time: number;
    last_heartbeat: string;
    status: string;
    active_tasks?: number;
  };
  usage_count?: number;
  last_used?: string;
}

describe('Content Authenticity Verification - London School TDD', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let analyzer: ContentAuthenticityAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAuthenticityAnalyzer();
    
    // Mock fetch collaborator
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Source Code Authenticity', () => {
    test('rejects any generateReal* function usage', () => {
      // Act: Analyze source code
      const sourceAnalysis = analyzer.analyzeSourceCode(
        '/workspaces/agent-feed/frontend/src/components/UnifiedAgentPage.tsx'
      );

      // Assert: Should NOT contain mock generation functions
      expect(sourceAnalysis.generateFunctions).toHaveLength(0);
      
      if (sourceAnalysis.generateFunctions.length > 0) {
        console.error('🚨 Generate functions found:', sourceAnalysis.generateFunctions);
        sourceAnalysis.generateFunctions.forEach(func => {
          console.error(`  - ${func}`);
        });
      }

      // Should not use Math.random for data generation
      expect(sourceAnalysis.mathRandomUsage).toHaveLength(0);
      
      if (sourceAnalysis.mathRandomUsage.length > 0) {
        console.error('🚨 Math.random usage found:', sourceAnalysis.mathRandomUsage);
      }

      // Overall source code should be authentic
      expect(sourceAnalysis.codeAuthentic).toBe(true);
    });

    test('scans for problematic code patterns in component', () => {
      const sourceCode = fs.readFileSync(
        '/workspaces/agent-feed/frontend/src/components/UnifiedAgentPage.tsx', 
        'utf8'
      );

      // Check for specific problematic patterns
      const problematicPatterns = [
        /generateRealActivities/,
        /generateRealPosts/,
        /Math\.random\(\)\s*\*\s*\d+/,
        /Math\.floor\(Math\.random\(\)\s*\*\s*\d+\)/,
        /fake.*activity/i,
        /mock.*post/i,
        /synthetic.*data/i,
        /\+\s*Math\.random\(\)/,
        /random\(\)\s*%/
      ];

      const foundProblems: string[] = [];
      
      problematicPatterns.forEach((pattern, index) => {
        const matches = sourceCode.match(pattern);
        if (matches) {
          foundProblems.push(`Pattern ${index + 1}: ${matches[0]}`);
        }
      });

      // Assert: No problematic patterns should exist
      expect(foundProblems).toHaveLength(0);
      
      if (foundProblems.length > 0) {
        console.error('🚨 Problematic code patterns found:');
        foundProblems.forEach(problem => console.error(`  - ${problem}`));
      }
    });

    test('verifies no hardcoded time calculations', () => {
      const sourceCode = fs.readFileSync(
        '/workspaces/agent-feed/frontend/src/components/UnifiedAgentPage.tsx',
        'utf8'
      );

      // Look for hardcoded time calculations that generate fake timestamps
      const timeCalculationPatterns = [
        /new Date\(Date\.now\(\)\s*-\s*\d+\s*\*\s*\d+\s*\*\s*\d+/,
        /Date\.now\(\)\s*-\s*\d+\s*\*\s*(60|3600|86400)/,
        /\d+\s*\*\s*60\s*\*\s*60\s*\*\s*1000/, // ms calculations
        /hours?\s*\*\s*60\s*\*\s*60/,
        /minutes?\s*\*\s*60/
      ];

      const foundTimeCalcs: string[] = [];
      
      timeCalculationPatterns.forEach(pattern => {
        const matches = sourceCode.match(pattern);
        if (matches) {
          foundTimeCalcs.push(matches[0]);
        }
      });

      // Assert: Should not have hardcoded time calculations for fake timestamps
      expect(foundTimeCalcs).toHaveLength(0);
      
      if (foundTimeCalcs.length > 0) {
        console.error('🚨 Hardcoded time calculations found:');
        foundTimeCalcs.forEach(calc => console.error(`  - ${calc}`));
      }
    });
  });

  describe('Runtime Content Authenticity', () => {
    test('only renders data from API response', async () => {
      // Arrange: Create API response with unique fingerprints
      const fingerprintedData: AuthenticApiData = {
        id: 'fingerprint-agent',
        name: 'FingerprintAgent',
        description: 'AUTHENTIC_DESC_ABC123',
        status: 'active',
        capabilities: ['AUTHENTIC_CAP_XYZ789'],
        performance_metrics: {
          success_rate: 73.456, // Unique decimal for tracking
          average_response_time: 142, // Unique integer for tracking
          total_tokens_used: 7654,
          error_count: 1
        },
        usage_count: 287 // Unique count for tracking
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: fingerprintedData
        })
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Wait for fingerprinted data to appear
      await waitFor(() => {
        expect(screen.getByText('AUTHENTIC_DESC_ABC123')).toBeInTheDocument();
        expect(screen.getByText('AUTHENTIC_CAP_XYZ789')).toBeInTheDocument();
        expect(screen.getByText('73%')).toBeInTheDocument(); // 73.456 rounded
        expect(screen.getByText('142s')).toBeInTheDocument();
        expect(screen.getByText('287')).toBeInTheDocument();
      });

      // Verify 1:1 mapping with no synthetic additions
      const pageContent = document.body.textContent || '';
      const contentAnalysis = analyzer.analyzeContent(pageContent);

      expect(contentAnalysis.authentic).toBe(true);
      
      if (!contentAnalysis.authentic) {
        console.error('🚨 Inauthentic content found:');
        console.error('  Synthetic:', contentAnalysis.synthetic);
        console.error('  Hardcoded:', contentAnalysis.hardcoded);
        console.error('  Random-like:', contentAnalysis.randomLike);
      }

      // Should NOT find any data that wasn't in API response
      const nonApiData = [
        'UNTRACKED',
        'GENERATED_CONTENT',
        'SYNTHETIC_DATA',
        'MOCK_ACTIVITY',
        'FAKE_POST'
      ];

      nonApiData.forEach(nonApi => {
        expect(pageContent).not.toContain(nonApi);
      });
    });

    test('activities section contains only API-derived content', async () => {
      // Arrange: API with specific health status to trace
      const healthStatusData: AuthenticApiData = {
        id: 'health-trace-agent',
        name: 'HealthTraceAgent',
        description: 'Health status authenticity test',
        status: 'active',
        capabilities: ['health-monitoring'],
        performance_metrics: {
          success_rate: 94.27,
          average_response_time: 198,
          total_tokens_used: 3456,
          error_count: 2
        },
        health_status: {
          cpu_usage: 37.8,
          memory_usage: 54.2,
          response_time: 267,
          last_heartbeat: '2024-09-10T14:25:30Z',
          status: 'healthy',
          active_tasks: 3
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: healthStatusData
        })
      } as Response);

      // Act: Render and navigate to activities
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('HealthTraceAgent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /activity/i }));

      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
      });

      // Assert: Any activities shown must derive from API data
      const pageContent = document.body.textContent || '';
      
      // If activities are shown, they must reference real API values
      if (pageContent.includes('CPU')) {
        expect(pageContent).toContain('37.8%'); // Real CPU usage
      }
      if (pageContent.includes('memory')) {
        expect(pageContent).toContain('54.2%'); // Real memory usage
      }
      if (pageContent.includes('success')) {
        expect(pageContent).toContain('94.27%') || expect(pageContent).toContain('94%'); // Real success rate
      }
      if (pageContent.includes('active tasks')) {
        expect(pageContent).toContain('3'); // Real active_tasks count
      }

      // Should NOT contain synthetic activity content
      const syntheticActivityContent = [
        'System optimization complete',
        'Performance boost detected',
        'Data analysis finished',
        'Maintenance cycle completed',
        'Backup process started'
      ];

      syntheticActivityContent.forEach(synthetic => {
        expect(pageContent).not.toContain(synthetic);
      });
    });

    test('posts section contains only milestone-based authentic content', async () => {
      // Arrange: API with milestone-worthy usage
      const milestoneData: AuthenticApiData = {
        id: 'milestone-trace-agent',
        name: 'MilestoneTraceAgent',
        description: 'Milestone authenticity test',
        status: 'active',
        capabilities: ['milestone-generation'],
        usage_count: 1500, // Above milestone thresholds
        performance_metrics: {
          success_rate: 91.3,
          average_response_time: 175,
          total_tokens_used: 8901,
          error_count: 4
        },
        last_used: '2024-09-09T10:30:00Z'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: milestoneData
        })
      } as Response);

      // Act: Render and check posts
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('MilestoneTraceAgent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /activity/i }));

      await waitFor(() => {
        expect(screen.getByText('Posts & Updates')).toBeInTheDocument();
      });

      // Assert: Any posts must be based on real milestones
      const pageContent = document.body.textContent || '';
      
      if (pageContent.includes('Milestone')) {
        // Must reference real usage_count: 1500
        expect(pageContent).toContain('1,500') || expect(pageContent).toContain('1500');
        
        // Interaction calculations must be deterministic from real data
        // If likes = Math.floor(usage_count / 50), then likes = Math.floor(1500/50) = 30
        if (pageContent.includes('like')) {
          expect(pageContent).toMatch(/\b30\b/); // Expected calculated value
        }
      }

      // Should NOT contain fabricated posts
      const fabricatedPosts = [
        'AI breakthrough achieved',
        'New capabilities unlocked',
        'Performance optimization successful',
        'User satisfaction improved',
        'System update completed'
      ];

      fabricatedPosts.forEach(fabricated => {
        expect(pageContent).not.toContain(fabricated);
      });
    });

    test('timestamps must be from API or calculated from API data', async () => {
      // Arrange: API with specific timestamp
      const timestampData: AuthenticApiData = {
        id: 'timestamp-agent',
        name: 'TimestampAgent',
        description: 'Timestamp authenticity test',
        status: 'active',
        capabilities: ['timestamp-tracking'],
        health_status: {
          cpu_usage: 45.0,
          memory_usage: 60.0,
          response_time: 200,
          last_heartbeat: '2024-09-10T16:45:00Z', // Specific timestamp to trace
          status: 'healthy'
        },
        last_used: '2024-09-09T08:30:00Z' // Specific last used time
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: timestampData
        })
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('TimestampAgent')).toBeInTheDocument();
      });

      // Assert: All timestamps should derive from API data
      const realHeartbeat = new Date('2024-09-10T16:45:00Z');
      const realLastUsed = new Date('2024-09-09T08:30:00Z');
      const now = new Date();

      // Any displayed timestamps should be calculated from these real values
      // Should NOT show hardcoded values like \"30 minutes ago\", \"2 hours ago\"
      const pageContent = document.body.textContent || '';
      
      // Check that suspiciously round time intervals are not present
      const suspiciousIntervals = [
        /exactly \d+ minutes? ago/,
        /exactly \d+ hours? ago/,
        /\b30 minutes? ago\b/,
        /\b2 hours? ago\b/,
        /\b1 hour ago\b/
      ];

      suspiciousIntervals.forEach(pattern => {
        expect(pageContent).not.toMatch(pattern);
      });
    });
  });

  describe('Edge Cases and Data Integrity', () => {
    test('handles empty API response without generating filler content', async () => {
      // Arrange: Completely empty API response
      const emptyData: AuthenticApiData = {
        id: 'empty-agent',
        name: 'EmptyAgent',
        description: 'Empty data test',
        status: 'inactive',
        capabilities: []
        // No optional fields
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: emptyData
        })
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('EmptyAgent')).toBeInTheDocument();
      });

      // Navigate to activity tab
      fireEvent.click(screen.getByRole('button', { name: /activity/i }));

      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
      });

      // Assert: Should show empty states, not generate filler content
      const pageContent = document.body.textContent || '';
      const contentAnalysis = analyzer.analyzeContent(pageContent);

      expect(contentAnalysis.synthetic).toHaveLength(0);
      expect(contentAnalysis.hardcoded).toHaveLength(0);

      // Should explicitly show empty states
      expect(screen.getByText(/No recent activities|No activities available/)).toBeInTheDocument();
      expect(screen.getByText(/No recent posts|No posts available/)).toBeInTheDocument();
    });

    test('verifies numeric precision preserved from API', async () => {
      // Arrange: API with precise decimal values
      const precisionData: AuthenticApiData = {
        id: 'precision-agent',
        name: 'PrecisionAgent',
        description: 'Numeric precision test',
        status: 'active',
        capabilities: ['precision-testing'],
        performance_metrics: {
          success_rate: 87.654321, // High precision decimal
          average_response_time: 123.789, // Decimal response time
          total_tokens_used: 9876543,
          error_count: 7
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: precisionData
        })
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Verify precision is preserved appropriately
      await waitFor(() => {
        expect(screen.getByText('PrecisionAgent')).toBeInTheDocument();
      });

      // Should show rounded values, but they should be derived from real API data
      expect(screen.getByText('87%')).toBeInTheDocument(); // 87.654321 rounded to 87%
      expect(screen.getByText('123.8s') || screen.getByText('124s')).toBeInTheDocument(); // 123.789 rounded

      // Should NOT show suspiciously precise fake values
      const pageContent = document.body.textContent || '';
      expect(pageContent).not.toContain('99.99%'); // Too perfect
      expect(pageContent).not.toContain('100.00%'); // Too perfect
      expect(pageContent).not.toContain('0.123s'); // Suspiciously precise
    });

    test('detects and rejects placeholder content', async () => {
      // This test catches if component tries to show placeholder content
      // when API data is loading or missing

      // Arrange: Delayed API response to catch placeholder content
      const realData: AuthenticApiData = {
        id: 'placeholder-test-agent',
        name: 'PlaceholderTestAgent',
        description: 'Real description from API',
        status: 'active',
        capabilities: ['real-capability']
      };

      const delayedResponse = new Promise<Response>(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({
              success: true,
              data: realData
            })
          } as Response);
        }, 100);
      });

      mockFetch.mockReturnValue(delayedResponse);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: During loading, should not show placeholder content
      const loadingContent = document.body.textContent || '';
      
      const placeholderPatterns = [
        'Lorem ipsum',
        'Placeholder text',
        'Sample content',
        'Demo agent',
        'Test activity',
        'Mock post'
      ];

      placeholderPatterns.forEach(placeholder => {
        expect(loadingContent).not.toContain(placeholder);
      });

      // Wait for real data to load
      await waitFor(() => {
        expect(screen.getByText('PlaceholderTestAgent')).toBeInTheDocument();
        expect(screen.getByText('Real description from API')).toBeInTheDocument();
      });
    });
  });

  describe('Content Authenticity Regression', () => {
    test('prevents regression of synthetic content patterns', async () => {
      // This test catches common patterns that indicate synthetic content generation
      
      const testData: AuthenticApiData = {
        id: 'regression-agent',
        name: 'RegressionAgent',
        description: 'Regression prevention test',
        status: 'active',
        capabilities: ['regression-testing']
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: testData
        })
      } as Response);

      // Act: Render component and check all tabs
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('RegressionAgent')).toBeInTheDocument();
      });

      // Navigate through all tabs
      const tabs = ['Details', 'Activity', 'Configuration'];
      for (const tab of tabs) {
        fireEvent.click(screen.getByRole('button', { name: new RegExp(tab, 'i') }));
        await waitFor(() => {
          expect(screen.getByRole('button', { name: new RegExp(tab, 'i') })).toHaveClass(/border-blue-500|text-blue-600/);
        });
      }

      // Assert: Scan all content for synthetic patterns
      const allContent = document.body.textContent || '';
      const regressionPatterns = [
        // Common synthetic content patterns
        /Achievement unlocked/i,
        /Level up/i,
        /Congratulations/i,
        /Outstanding performance/i,
        /Excellent work/i,
        /Keep up the good work/i,
        /You're doing great/i,
        
        // Generated activity patterns
        /Task #\d+ completed/i,
        /Session \d+ started/i,
        /Workflow \d+ finished/i,
        /Process \d+ initiated/i,
        
        // Fake milestone patterns
        /Reached level \d+/i,
        /Unlocked achievement/i,
        /New badge earned/i,
        /Skill point gained/i
      ];

      const foundRegressions: string[] = [];
      regressionPatterns.forEach((pattern, index) => {
        const matches = allContent.match(pattern);
        if (matches) {
          foundRegressions.push(`Regression pattern ${index + 1}: ${matches[0]}`);
        }
      });

      expect(foundRegressions).toHaveLength(0);
      
      if (foundRegressions.length > 0) {
        console.error('🚨 Content authenticity regression detected:');
        foundRegressions.forEach(regression => console.error(`  - ${regression}`));
      }
    });
  });
});