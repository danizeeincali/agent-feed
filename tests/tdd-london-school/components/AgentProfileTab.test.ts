/**
 * AgentProfileTab TDD London School Tests
 * Red-Green-Refactor implementation with behavior verification
 * Tests profile display, capabilities, use cases, and human-oriented descriptions
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentProfileTab } from '../../../frontend/src/components/AgentProfileTab';
import { UnifiedAgentData } from '../../../frontend/src/components/UnifiedAgentPage';
import { jest } from '@jest/globals';

describe('AgentProfileTab - London School TDD', () => {
  let mockAgent: UnifiedAgentData;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    
    // Real agent data structure with profile information
    mockAgent = {
      id: 'profile-agent-001',
      name: 'Profile Test Agent',
      display_name: 'Advanced Profile Agent',
      description: 'A sophisticated AI agent specialized in data analysis and automation',
      status: 'active',
      capabilities: [
        'Data Analysis',
        'Process Automation',
        'Report Generation',
        'API Integration',
        'Machine Learning',
        'Natural Language Processing'
      ],
      stats: {
        tasksCompleted: 2847,
        successRate: 97.8,
        averageResponseTime: 0.85,
        uptime: 99.6,
        todayTasks: 23,
        weeklyTasks: 156,
        satisfaction: 4.8
      },
      configuration: {
        profile: {
          name: 'Advanced Profile Agent',
          description: 'A sophisticated AI agent designed for complex data analysis tasks',
          specialization: 'Data Science and Automation',
          avatar: '🤖'
        },
        behavior: {
          responseStyle: 'technical',
          proactivity: 'high',
          verbosity: 'comprehensive'
        },
        privacy: {
          isPublic: true,
          showMetrics: true,
          showActivity: true,
          allowComments: true
        },
        theme: {
          primaryColor: '#6366F1',
          accentColor: '#EC4899',
          layout: 'grid'
        }
      },
      recentActivities: [],
      recentPosts: [],
      // Profile-specific data
      profile: {
        strengths: [
          'Advanced Analytics',
          'Real-time Processing',
          'Complex Problem Solving',
          'Scalable Architecture'
        ],
        useCases: [
          'Business Intelligence',
          'Predictive Analytics',
          'Process Optimization',
          'Data Pipeline Automation'
        ],
        limitations: [
          'Large dataset processing requires additional memory',
          'Real-time streaming has latency constraints',
          'Complex queries may require extended processing time'
        ]
      },
      metadata: {
        languages: ['Python', 'JavaScript', 'SQL', 'R'],
        repository: 'https://github.com/ai-agents/profile-agent',
        documentation: 'https://docs.ai-agents.com/profile-agent',
        author: 'AI Development Team',
        license: 'MIT'
      },
      createdAt: '2024-01-01T00:00:00Z',
      lastActiveAt: '2024-01-15T14:30:00Z',
      version: '2.1.0'
    };

    jest.clearAllMocks();
  });

  describe('RED PHASE - Failing Tests', () => {
    test('SHOULD display agent purpose and mission correctly', () => {
      render(<AgentProfileTab agent={mockAgent} />);
      
      // FAILING: Should display purpose from configuration
      expect(screen.getByTestId('agent-purpose')).toBeInTheDocument();
      expect(screen.getByText(mockAgent.configuration!.profile!.description!)).toBeInTheDocument();
      
      // FAILING: Should display specialization badge
      expect(screen.getByText('Data Science and Automation')).toBeInTheDocument();
      
      // FAILING: Should show purpose section with proper heading
      expect(screen.getByText('Purpose & Mission')).toBeInTheDocument();
    });

    test('SHOULD render agent statistics with proper formatting', () => {
      render(<AgentProfileTab agent={mockAgent} />);
      
      // FAILING: Should display statistics grid
      expect(screen.getByTestId('agent-statistics')).toBeInTheDocument();
      
      // FAILING: Should show capabilities count
      expect(screen.getByText('6')).toBeInTheDocument(); // 6 capabilities
      expect(screen.getByText('Capabilities')).toBeInTheDocument();
      
      // FAILING: Should show success rate
      expect(screen.getByText('97.8%')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      
      // FAILING: Should show tasks completed
      expect(screen.getByText('2847')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      
      // FAILING: Should show programming languages count
      expect(screen.getByText('4')).toBeInTheDocument(); // 4 languages
      expect(screen.getByText('Languages')).toBeInTheDocument();
    });

    test('SHOULD display core strengths with proper styling', () => {
      render(<AgentProfileTab agent={mockAgent} />);
      
      // FAILING: Should render strengths section
      expect(screen.getByTestId('agent-strengths')).toBeInTheDocument();
      expect(screen.getByText('Core Strengths')).toBeInTheDocument();
      
      // FAILING: Should display all strengths with check icons
      mockAgent.profile!.strengths!.forEach(strength => {
        expect(screen.getByText(strength)).toBeInTheDocument();
      });
      
      // FAILING: Should have proper description
      expect(screen.getByText('Key areas where this agent excels and delivers exceptional performance')).toBeInTheDocument();
    });

    test('SHOULD render use cases with detailed information', () => {
      render(<AgentProfileTab agent={mockAgent} />);
      
      // FAILING: Should render use cases section
      expect(screen.getByTestId('agent-use-cases')).toBeInTheDocument();
      expect(screen.getByText('Common Use Cases')).toBeInTheDocument();
      
      // FAILING: Should display all use cases
      mockAgent.profile!.useCases!.forEach(useCase => {
        expect(screen.getByText(useCase)).toBeInTheDocument();
      });
      
      // FAILING: Should show optimized workflow descriptions
      expect(screen.getByText('Optimized workflow for business intelligence scenarios')).toBeInTheDocument();
      expect(screen.getByText('Optimized workflow for predictive analytics scenarios')).toBeInTheDocument();
    });

    test('SHOULD display technical capabilities as badges', () => {
      render(<AgentProfileTab agent={mockAgent} />);
      
      // FAILING: Should render capabilities section
      expect(screen.getByTestId('agent-capabilities')).toBeInTheDocument();
      expect(screen.getByText('Technical Capabilities')).toBeInTheDocument();
      
      // FAILING: Should display all capabilities as badges
      mockAgent.capabilities.forEach(capability => {
        expect(screen.getByText(capability)).toBeInTheDocument();
      });
      
      // FAILING: Should have proper section description
      expect(screen.getByText('Specific technical skills and functionalities available')).toBeInTheDocument();
    });

    test('SHOULD render programming languages section', () => {
      render(<AgentProfileTab agent={mockAgent} />);
      
      // FAILING: Should display languages section
      expect(screen.getByTestId('agent-languages')).toBeInTheDocument();
      expect(screen.getByText('Programming Languages')).toBeInTheDocument();
      
      // FAILING: Should show all programming languages
      mockAgent.metadata!.languages!.forEach(language => {
        expect(screen.getByText(language)).toBeInTheDocument();
      });
      
      // FAILING: Should have proper description
      expect(screen.getByText('Languages and technologies this agent can work with')).toBeInTheDocument();
    });

    test('SHOULD display limitations and considerations', () => {
      render(<AgentProfileTab agent={mockAgent} />);
      
      // FAILING: Should render limitations section
      expect(screen.getByTestId('agent-limitations')).toBeInTheDocument();
      expect(screen.getByText('Limitations & Considerations')).toBeInTheDocument();
      
      // FAILING: Should display all limitations with warning styling
      mockAgent.profile!.limitations!.forEach(limitation => {
        expect(screen.getByText(limitation)).toBeInTheDocument();
      });
      
      // FAILING: Should have proper warning description
      expect(screen.getByText('Important considerations and current limitations to be aware of')).toBeInTheDocument();
    });

    test('SHOULD render external resources with proper links', () => {
      render(<AgentProfileTab agent={mockAgent} />);
      
      // FAILING: Should display external resources section
      expect(screen.getByTestId('agent-external-resources')).toBeInTheDocument();
      expect(screen.getByText('External Resources')).toBeInTheDocument();
      
      // FAILING: Should render repository link
      const repoLink = screen.getByText('Repository').closest('a');
      expect(repoLink).toHaveAttribute('href', mockAgent.metadata!.repository);
      expect(repoLink).toHaveAttribute('target', '_blank');
      expect(repoLink).toHaveAttribute('rel', 'noopener noreferrer');
      
      // FAILING: Should render documentation link
      const docLink = screen.getByText('Documentation').closest('a');
      expect(docLink).toHaveAttribute('href', mockAgent.metadata!.documentation);
      expect(docLink).toHaveAttribute('target', '_blank');
      expect(docLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('SHOULD display additional information metadata', () => {
      render(<AgentProfileTab agent={mockAgent} />);
      
      // FAILING: Should render additional info section
      expect(screen.getByTestId('agent-additional-info')).toBeInTheDocument();
      
      // FAILING: Should display author information
      expect(screen.getByText('Author:')).toBeInTheDocument();
      expect(screen.getByText(mockAgent.metadata!.author!)).toBeInTheDocument();
      
      // FAILING: Should display license information
      expect(screen.getByText('License:')).toBeInTheDocument();
      expect(screen.getByText(mockAgent.metadata!.license!)).toBeInTheDocument();
      
      // FAILING: Should display version
      expect(screen.getByText('Version:')).toBeInTheDocument();
      expect(screen.getByText(`v${mockAgent.version!}`)).toBeInTheDocument();
      
      // FAILING: Should display uptime
      expect(screen.getByText('Uptime:')).toBeInTheDocument();
      expect(screen.getByText(`${mockAgent.stats.uptime}%`)).toBeInTheDocument();
    });

    test('SHOULD handle agent with no profile data gracefully', () => {
      const agentWithoutProfile = {
        ...mockAgent,
        profile: undefined,
        metadata: undefined,
        configuration: undefined
      };
      
      render(<AgentProfileTab agent={agentWithoutProfile} />);
      
      // FAILING: Should still render basic agent information
      expect(screen.getByTestId('agent-statistics')).toBeInTheDocument();
      
      // FAILING: Should handle missing profile gracefully
      expect(screen.getByText('No purpose specified')).toBeInTheDocument();
    });

    test('SHOULD handle null/undefined agent gracefully', () => {
      render(<AgentProfileTab agent={null as any} />);
      
      // FAILING: Should show no profile available message
      expect(screen.getByText('No Profile Available')).toBeInTheDocument();
      expect(screen.getByText('Agent profile information is not available.')).toBeInTheDocument();
    });
  });

  describe('Behavior Verification - London School Contracts', () => {
    test('SHOULD verify component re-rendering with updated agent data', () => {
      const { rerender } = render(<AgentProfileTab agent={mockAgent} />);
      
      // FAILING: Should handle agent data updates
      const updatedAgent = {
        ...mockAgent,
        stats: {
          ...mockAgent.stats,
          successRate: 99.2,
          tasksCompleted: 3000
        }
      };
      
      rerender(<AgentProfileTab agent={updatedAgent} />);
      
      expect(screen.getByText('99.2%')).toBeInTheDocument();
      expect(screen.getByText('3000')).toBeInTheDocument();
    });

    test('SHOULD verify data extraction contracts from different sources', () => {
      // Test fallback data extraction logic
      const agentWithMixedData = {
        ...mockAgent,
        profile: undefined, // No direct profile
        metadata: {
          ...mockAgent.metadata,
          strengths: ['Fallback Strength 1', 'Fallback Strength 2']
        }
      };
      
      render(<AgentProfileTab agent={agentWithMixedData} />);
      
      // FAILING: Should extract data from metadata when profile is unavailable
      expect(screen.getByText('Fallback Strength 1')).toBeInTheDocument();
      expect(screen.getByText('Fallback Strength 2')).toBeInTheDocument();
    });

    test('SHOULD verify proper conditional rendering behavior', () => {
      const minimalAgent = {
        ...mockAgent,
        capabilities: [],
        profile: { strengths: [], useCases: [], limitations: [] },
        metadata: { languages: [] }
      };
      
      render(<AgentProfileTab agent={minimalAgent} />);
      
      // FAILING: Should not render empty sections
      expect(screen.queryByTestId('agent-strengths')).not.toBeInTheDocument();
      expect(screen.queryByTestId('agent-use-cases')).not.toBeInTheDocument();
      expect(screen.queryByTestId('agent-limitations')).not.toBeInTheDocument();
      expect(screen.queryByTestId('agent-languages')).not.toBeInTheDocument();
      expect(screen.queryByTestId('agent-external-resources')).not.toBeInTheDocument();
    });
  });

  describe('Real Data Integration Contracts', () => {
    test('SHOULD handle real API data structure variations', () => {
      // Test with actual API response structure
      const realApiAgent = {
        ...mockAgent,
        system_prompt: 'Advanced AI system specialized in data analysis',
        avatar_color: '#8B5CF6',
        performance_metrics: {
          success_rate: 97.8,
          average_response_time: 850,
          total_tokens_used: 285000,
          error_count: 5,
          uptime_percentage: 99.6
        }
      };

      render(<AgentProfileTab agent={realApiAgent} />);
      
      // FAILING: Should extract data from real API structure
      expect(screen.getByTestId('agent-additional-info')).toBeInTheDocument();
    });

    test('SHOULD verify zero mock data contamination in profile content', () => {
      render(<AgentProfileTab agent={mockAgent} />);
      
      // FAILING: Should contain only real agent data
      const profileContent = screen.getByTestId('agent-purpose');
      
      // Check for mock data patterns
      expect(profileContent.textContent).not.toMatch(/lorem ipsum/i);
      expect(profileContent.textContent).not.toMatch(/placeholder/i);
      expect(profileContent.textContent).not.toMatch(/example.*data/i);
      expect(profileContent.textContent).not.toMatch(/mock.*agent/i);
      
      // Should contain actual agent data
      expect(profileContent.textContent).toContain('sophisticated AI agent');
      expect(profileContent.textContent).toContain('data analysis');
    });

    test('SHOULD verify statistics display uses real performance metrics', () => {
      render(<AgentProfileTab agent={mockAgent} />);
      
      const statisticsSection = screen.getByTestId('agent-statistics');
      
      // FAILING: Should display real success rate, not hardcoded values
      expect(statisticsSection).toContainElement(screen.getByText('97.8%'));
      
      // FAILING: Should display real task count
      expect(statisticsSection).toContainElement(screen.getByText('2847'));
      
      // FAILING: Should calculate capabilities count from real data
      expect(statisticsSection).toContainElement(screen.getByText('6'));
      
      // FAILING: Should not contain generic mock statistics
      expect(statisticsSection.textContent).not.toMatch(/100%|999|sample/i);
    });
  });
});