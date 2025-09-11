/**
 * TDD London School: Mock Data Contamination Detection Tests
 * 
 * CRITICAL MISSION: Catch ANY remaining mock data in UnifiedAgentPage
 * Tests based on London School TDD principles:
 * - Mock collaborators to isolate behavior
 * - Verify interactions, not implementation
 * - Focus on component contracts and behavior
 * - Catch data contamination at the boundary
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Test collaborator mocks
const mockNavigate = jest.fn();
const mockParams = { agentId: 'contamination-test-agent' };

// Mock router collaborator
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

// Mock data contamination detector
class MockDataDetector {
  private syntheticPatterns = [
    /Achievement: \d+ tasks completed/,
    /Generated insight/,
    /Demo activity/,
    /Sample post/,
    /Mock data/,
    /Fake activity/,
    /Random.*generated/,
    /Milestone: .*K tasks/,
    /Performance boost detected/,
    /System optimization complete/
  ];

  private randomDataPatterns = [
    /\d{1,2} minutes? ago/, // Suspiciously round timestamps
    /\d{1,2} hours? ago/,   // Generated time offsets
    /(\d+\.\d+)% success rate/ // Random percentages
  ];

  detectSyntheticContent(content: string): string[] {
    const detected: string[] = [];
    
    this.syntheticPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        detected.push(`Synthetic pattern detected: ${pattern.source}`);
      }
    });
    
    return detected;
  }

  detectRandomData(content: string): string[] {
    const detected: string[] = [];
    
    this.randomDataPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        detected.push(`Potential random data: ${matches[0]}`);
      }
    });
    
    return detected;
  }
}

// Real API data contract
interface RealApiContract {
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
    validations_completed?: number;
    uptime_percentage?: number;
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
  created_at?: string;
}

describe('Mock Data Contamination Detection - London School TDD', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let detector: MockDataDetector;
  let mathRandomSpy: jest.SpyInstance;
  let randomCallCount: number;

  beforeEach(() => {
    // Setup detector
    detector = new MockDataDetector();
    
    // Spy on Math.random to catch contamination
    randomCallCount = 0;
    mathRandomSpy = jest.spyOn(Math, 'random').mockImplementation(() => {
      randomCallCount++;
      console.warn(`🚨 Math.random() called! Count: ${randomCallCount}`);
      return 0.5; // Fixed for deterministic tests
    });
    
    // Mock fetch collaborator
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    mathRandomSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('Test 1: Mock Data Detection', () => {
    test('should NOT generate any synthetic activities', async () => {
      // Arrange: Mock API returning minimal real data
      const minimalApiData: RealApiContract = {
        id: 'contamination-test-agent',
        name: 'ContaminationTestAgent',
        description: 'Agent for contamination testing',
        status: 'active',
        capabilities: ['testing'],
        performance_metrics: {
          success_rate: 85.5,
          average_response_time: 150,
          total_tokens_used: 1000,
          error_count: 2
        }
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: minimalApiData
        })
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('ContaminationTestAgent')).toBeInTheDocument();
      });

      // Navigate to Activity tab to check for synthetic activities
      const activityTab = screen.getByRole('button', { name: /activity/i });
      fireEvent.click(activityTab);

      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
      });

      // Critical assertion: NO synthetic activities should be generated
      const activityItems = screen.queryAllByTestId('activity-item');
      expect(activityItems).toHaveLength(0); // Should be empty when no real data
      
      // Scan for synthetic content patterns
      const pageContent = document.body.textContent || '';
      const detectedSynthetic = detector.detectSyntheticContent(pageContent);
      
      expect(detectedSynthetic).toHaveLength(0); // No synthetic content allowed
      detectedSynthetic.forEach(detection => {
        console.error(`🚨 Synthetic content detected: ${detection}`);
      });
    });

    test('should NOT create fabricated posts', async () => {
      // Arrange: Mock API without posts data
      const apiDataWithoutPosts: RealApiContract = {
        id: 'no-posts-agent',
        name: 'NoPostsAgent', 
        description: 'Agent without posts',
        status: 'active',
        capabilities: ['basic']
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: apiDataWithoutPosts
        })
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('NoPostsAgent')).toBeInTheDocument();
      });

      // Navigate to Activity tab
      fireEvent.click(screen.getByRole('button', { name: /activity/i }));

      await waitFor(() => {
        expect(screen.getByText('Posts & Updates')).toBeInTheDocument();
      });

      // Critical assertion: NO fabricated posts
      const pageContent = document.body.textContent || '';
      const fabricatedPostPatterns = [
        'Achievement: 1000 tasks completed',
        'Milestone reached',
        'Generated insight',
        'Performance optimization',
        'System analysis complete'
      ];
      
      fabricatedPostPatterns.forEach(pattern => {
        expect(pageContent).not.toContain(pattern);
      });
      
      // Should show empty state instead
      expect(screen.getByText(/No recent posts|No posts available/)).toBeInTheDocument();
    });

    test('should only display API-sourced content', async () => {
      // Arrange: Mock specific API data to trace
      const trackedApiData: RealApiContract = {
        id: 'tracked-agent',
        name: 'TrackedAgent',
        description: 'Agent with tracked data',
        status: 'active',
        capabilities: ['capability-1', 'capability-2'],
        performance_metrics: {
          success_rate: 92.75, // Specific trackable value
          average_response_time: 187, // Specific trackable value
          total_tokens_used: 5432, // Specific trackable value
          error_count: 1
        },
        usage_count: 123 // Specific trackable value
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: trackedApiData
        })
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Verify API call was made
      expect(mockFetch).toHaveBeenCalledWith('/api/agents/contamination-test-agent');
      
      await waitFor(() => {
        expect(screen.getByText('TrackedAgent')).toBeInTheDocument();
      });

      // Critical: Every displayed metric must trace back to API
      expect(screen.getByText('92%')).toBeInTheDocument(); // success_rate: 92.75
      expect(screen.getByText('187s')).toBeInTheDocument(); // average_response_time: 187
      expect(screen.getByText('123')).toBeInTheDocument(); // usage_count: 123
      
      // Verify capabilities from API
      expect(screen.getByText('capability-1')).toBeInTheDocument();
      expect(screen.getByText('capability-2')).toBeInTheDocument();
      
      // No data should appear that wasn't in API response
      const pageContent = document.body.textContent || '';
      const randomDataDetected = detector.detectRandomData(pageContent);
      
      expect(randomDataDetected).toHaveLength(0);
      randomDataDetected.forEach(detection => {
        console.error(`🚨 Random data detected: ${detection}`);
      });
    });
  });

  describe('Test 2: Real API Dependency', () => {
    test('shows empty state when no activities API data', async () => {
      // Arrange: Mock API with no activity data
      const noActivityData: RealApiContract = {
        id: 'no-activity-agent',
        name: 'NoActivityAgent',
        description: 'Agent without activities',
        status: 'inactive',
        capabilities: []
        // No performance_metrics or health_status
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: noActivityData
        })
      } as Response);

      // Act: Render and navigate to activities
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('NoActivityAgent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /activity/i }));

      // Assert: Should show "No recent activities" not generated activities
      await waitFor(() => {
        expect(screen.getByText(/No recent activities|No activities available/)).toBeInTheDocument();
      });
      
      // Should NOT generate fake activities
      const fakeActivities = [
        'Task completed',
        'System check',
        'Performance update',
        'Health check complete'
      ];
      
      const pageContent = document.body.textContent || '';
      fakeActivities.forEach(fake => {
        expect(pageContent).not.toContain(fake);
      });
    });

    test('shows empty state when no posts API data', async () => {
      // Arrange: Mock API with no posts capability
      const noPostsData: RealApiContract = {
        id: 'no-posts-agent',
        name: 'NoPostsAgent',
        description: 'Agent without posting capability',
        status: 'active',
        capabilities: ['read-only'],
        usage_count: 0 // No usage means no milestone posts
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: noPostsData
        })
      } as Response);

      // Act: Render and navigate to posts
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('NoPostsAgent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /activity/i }));

      // Assert: Should show "No recent posts" not fabricated content
      await waitFor(() => {
        expect(screen.getByText(/No recent posts|No posts available/)).toBeInTheDocument();
      });
      
      // Should NOT fabricate posts
      const fabricatedPosts = [
        'Milestone achievement',
        'Performance insights',
        'Recent activity update',
        'Optimization complete'
      ];
      
      const pageContent = document.body.textContent || '';
      fabricatedPosts.forEach(fake => {
        expect(pageContent).not.toContain(fake);
      });
    });
  });

  describe('Test 3: Content Authenticity Verification', () => {
    test('rejects any generateReal* function usage', () => {
      // Act: Read source code to check for problematic functions
      const fs = require('fs');
      const sourceCode = fs.readFileSync(
        '/workspaces/agent-feed/frontend/src/components/UnifiedAgentPage.tsx',
        'utf8'
      );

      // Assert: Should NOT contain mock generation functions
      expect(sourceCode).not.toMatch(/generateReal\w+/);
      expect(sourceCode).not.toMatch(/mock.*data/i);
      expect(sourceCode).not.toMatch(/fake.*data/i);
      expect(sourceCode).not.toMatch(/synthetic.*data/i);
      
      // Should not use Math.random for data generation
      const mathRandomMatches = sourceCode.match(/Math\.random\(\)/g);
      if (mathRandomMatches) {
        console.warn(`🚨 Found ${mathRandomMatches.length} Math.random() calls in source`);
        expect(mathRandomMatches.length).toBe(0); // Will fail initially
      }
    });

    test('only renders data from API response', async () => {
      // Arrange: Create API response with known data fingerprint
      const fingerprintedData: RealApiContract = {
        id: 'fingerprint-agent',
        name: 'FingerprintAgent',
        description: 'FINGERPRINT_DESC_12345', // Unique identifier
        status: 'active',
        capabilities: ['FINGERPRINT_CAP_67890'], // Unique identifier
        performance_metrics: {
          success_rate: 77.123, // Unique decimal
          average_response_time: 333, // Unique number
          total_tokens_used: 9876,
          error_count: 0
        }
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

      // Assert: Verify fingerprinted data appears
      await waitFor(() => {
        expect(screen.getByText('FINGERPRINT_DESC_12345')).toBeInTheDocument();
        expect(screen.getByText('FINGERPRINT_CAP_67890')).toBeInTheDocument();
        expect(screen.getByText('77%')).toBeInTheDocument(); // 77.123 rounded
        expect(screen.getByText('333s')).toBeInTheDocument();
      });
      
      // Ensure 1:1 mapping with no synthetic additions
      const pageContent = document.body.textContent || '';
      
      // Should NOT find any data that wasn't in API response
      const nonApiData = [
        'Generated activity',
        'Sample post',
        'Mock achievement',
        'Random milestone'
      ];
      
      nonApiData.forEach(nonApi => {
        expect(pageContent).not.toContain(nonApi);
      });
    });
  });

  describe('Math.random() Elimination Tests', () => {
    test('should NOT call Math.random() during component lifecycle', async () => {
      // Arrange: Mock API data
      const apiData: RealApiContract = {
        id: 'random-test-agent',
        name: 'RandomTestAgent',
        description: 'Testing Math.random elimination',
        status: 'active',
        capabilities: ['deterministic'],
        performance_metrics: {
          success_rate: 90,
          average_response_time: 200,
          total_tokens_used: 1000,
          error_count: 0
        }
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: apiData
        })
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('RandomTestAgent')).toBeInTheDocument();
      });

      // Navigate through all tabs to trigger any Math.random() calls
      const tabs = ['Details', 'Activity', 'Configuration'];
      for (const tab of tabs) {
        fireEvent.click(screen.getByRole('button', { name: new RegExp(tab, 'i') }));
        await waitFor(() => {
          expect(screen.getByRole('button', { name: new RegExp(tab, 'i') })).toHaveClass(/border-blue-500|text-blue-600/);
        });
      }

      // Assert: Math.random should NOT be called
      expect(randomCallCount).toBe(0);
      if (randomCallCount > 0) {
        console.error(`🚨 Math.random() called ${randomCallCount} times during component lifecycle!`);
      }
    });

    test('should produce deterministic output with same API input', async () => {
      const deterministicData: RealApiContract = {
        id: 'deterministic-agent',
        name: 'DeterministicAgent',
        description: 'Deterministic test agent',
        status: 'active',
        capabilities: ['deterministic'],
        performance_metrics: {
          success_rate: 95.5,
          average_response_time: 150,
          total_tokens_used: 2000,
          error_count: 1
        },
        usage_count: 50,
        last_used: '2024-09-10T12:00:00Z'
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: deterministicData
        })
      } as Response);

      // First render
      const { unmount } = render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('DeterministicAgent')).toBeInTheDocument();
      });

      const firstRenderContent = document.body.textContent;
      unmount();

      // Second render with same data
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: deterministicData
        })
      } as Response);

      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('DeterministicAgent')).toBeInTheDocument();
      });

      const secondRenderContent = document.body.textContent;

      // Assert: Both renders should produce identical output
      expect(firstRenderContent).toBe(secondRenderContent);
    });
  });

  describe('Behavior Verification Focus', () => {
    test('component should ONLY add data that comes directly from API responses', async () => {
      // This is the core London School behavior test
      // We're testing HOW the component collaborates with the API
      
      const strictApiData: RealApiContract = {
        id: 'strict-agent',
        name: 'StrictAgent',
        description: 'Strict API compliance test',
        status: 'active',
        capabilities: ['strict'],
        // Deliberately minimal data to catch any additions
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: strictApiData
        })
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Verify collaboration contract
      expect(mockFetch).toHaveBeenCalledWith('/api/agents/contamination-test-agent');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      await waitFor(() => {
        expect(screen.getByText('StrictAgent')).toBeInTheDocument();
      });

      // Navigate to activity tab
      fireEvent.click(screen.getByRole('button', { name: /activity/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
      });

      // CRITICAL: Since API data has no activities/posts, component should show EMPTY state
      // Any activities displayed = CONTAMINATION
      const activitySection = screen.getByText('Recent Activities').closest('div');
      if (activitySection) {
        const hasActivities = activitySection.textContent?.includes('task') || 
                            activitySection.textContent?.includes('completed') ||
                            activitySection.textContent?.includes('achievement');
        
        expect(hasActivities).toBe(false); // Should be false - no activities generated
      }

      // No Math.random should be called for data generation
      expect(randomCallCount).toBe(0);
    });
  });
});
