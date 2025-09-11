/**
 * TDD London School Tests for AgentProfileTab Component
 * SPARC Phase 4A: Test-Driven Development Implementation
 * 
 * Test Coverage: Profile display, capabilities, use cases, limitations, external resources
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentProfileTab } from '../../../frontend/src/components/AgentProfileTab';
import { UnifiedAgentData } from '../../../frontend/src/components/UnifiedAgentPage';

// Mock window.open for external links
global.open = vi.fn();

describe('AgentProfileTab - TDD London School', () => {
  let mockAgent: UnifiedAgentData;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    
    mockAgent = {
      id: 'test-agent',
      name: 'Test Agent',
      display_name: 'Test Agent',
      description: 'Test agent for profile testing',
      status: 'active',
      version: '2.1.0',
      capabilities: ['Code Generation', 'Testing', 'Documentation', 'Analysis'],
      stats: {
        tasksCompleted: 150,
        successRate: 95,
        averageResponseTime: 1.2,
        uptime: 99.5,
        todayTasks: 5,
        weeklyTasks: 25,
        satisfaction: 4.5
      },
      recentActivities: [],
      recentPosts: [],
      configuration: {
        profile: {
          name: 'Test Agent',
          description: 'Advanced AI agent for testing',
          specialization: 'Testing and Quality Assurance',
          avatar: '🤖'
        },
        behavior: {
          responseStyle: 'friendly',
          proactivity: 'medium',
          verbosity: 'detailed'
        },
        privacy: {
          isPublic: true,
          showMetrics: true,
          showActivity: true,
          allowComments: true
        },
        theme: {
          primaryColor: '#3B82F6',
          accentColor: '#8B5CF6',
          layout: 'grid'
        }
      },
      metadata: {
        fileCount: 24,
        languages: ['TypeScript', 'Python', 'JavaScript'],
        author: 'SPARC Team',
        license: 'MIT',
        repository: 'https://github.com/sparc/agents',
        documentation: 'https://docs.sparc.ai/agents'
      },
      profile: {
        purpose: 'Automate complex testing workflows with intelligent analysis capabilities',
        strengths: ['Pattern Recognition', 'Process Optimization', 'Quality Assurance', 'Test Automation'],
        useCases: ['CI/CD Pipeline Testing', 'Code Review Automation', 'Performance Testing', 'Bug Detection'],
        limitations: ['Requires clear test specifications', 'Limited to programmatic testing', 'Cannot test physical interfaces']
      },
      createdAt: '2024-01-01T00:00:00Z',
      lastActiveAt: '2024-12-01T12:00:00Z'
    };
  });

  describe('Component Rendering', () => {
    it('should render agent purpose and mission section', () => {
      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.getByTestId('agent-purpose')).toBeInTheDocument();
      expect(screen.getByText('Automate complex testing workflows with intelligent analysis capabilities')).toBeInTheDocument();
      expect(screen.getByText('Purpose & Mission')).toBeInTheDocument();
    });

    it('should fallback to agent description when purpose is not available', () => {
      // Arrange
      mockAgent.profile = { ...mockAgent.profile!, purpose: undefined };

      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.getByTestId('agent-purpose')).toBeInTheDocument();
      expect(screen.getByText('Test agent for profile testing')).toBeInTheDocument();
    });

    it('should display agent statistics correctly', () => {
      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      const statsSection = screen.getByTestId('agent-statistics');
      expect(statsSection).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument(); // Capabilities count
      expect(screen.getByText('v2.1.0')).toBeInTheDocument(); // Version
      expect(screen.getByText('24')).toBeInTheDocument(); // File count
      expect(screen.getByText('3')).toBeInTheDocument(); // Languages count
    });

    it('should show "No Profile Available" when agent is null', () => {
      // Act
      render(<AgentProfileTab agent={null as any} />);

      // Assert
      expect(screen.getByText('No Profile Available')).toBeInTheDocument();
      expect(screen.getByText('Agent profile information is not available.')).toBeInTheDocument();
    });
  });

  describe('Core Strengths Section', () => {
    it('should render core strengths when available', () => {
      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      const strengthsSection = screen.getByTestId('agent-strengths');
      expect(strengthsSection).toBeInTheDocument();
      expect(screen.getByText('Core Strengths')).toBeInTheDocument();
      expect(screen.getByText('Pattern Recognition')).toBeInTheDocument();
      expect(screen.getByText('Process Optimization')).toBeInTheDocument();
      expect(screen.getByText('Quality Assurance')).toBeInTheDocument();
      expect(screen.getByText('Test Automation')).toBeInTheDocument();
    });

    it('should not render strengths section when strengths are empty', () => {
      // Arrange
      mockAgent.profile = { ...mockAgent.profile!, strengths: [] };

      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.queryByTestId('agent-strengths')).not.toBeInTheDocument();
    });

    it('should not render strengths section when profile is undefined', () => {
      // Arrange
      mockAgent.profile = undefined;

      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.queryByTestId('agent-strengths')).not.toBeInTheDocument();
    });
  });

  describe('Use Cases Section', () => {
    it('should render use cases when available', () => {
      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      const useCasesSection = screen.getByTestId('agent-use-cases');
      expect(useCasesSection).toBeInTheDocument();
      expect(screen.getByText('Common Use Cases')).toBeInTheDocument();
      expect(screen.getByText('CI/CD Pipeline Testing')).toBeInTheDocument();
      expect(screen.getByText('Code Review Automation')).toBeInTheDocument();
      expect(screen.getByText('Performance Testing')).toBeInTheDocument();
      expect(screen.getByText('Bug Detection')).toBeInTheDocument();
    });

    it('should show optimized workflow descriptions for use cases', () => {
      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Optimized workflow for ci/cd pipeline testing scenarios')).toBeInTheDocument();
      expect(screen.getByText('Optimized workflow for code review automation scenarios')).toBeInTheDocument();
    });

    it('should not render use cases section when use cases are empty', () => {
      // Arrange
      mockAgent.profile = { ...mockAgent.profile!, useCases: [] };

      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.queryByTestId('agent-use-cases')).not.toBeInTheDocument();
    });
  });

  describe('Technical Capabilities Section', () => {
    it('should render technical capabilities as badges', () => {
      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Technical Capabilities')).toBeInTheDocument();
      expect(screen.getByText('Code Generation')).toBeInTheDocument();
      expect(screen.getByText('Testing')).toBeInTheDocument();
      expect(screen.getByText('Documentation')).toBeInTheDocument();
      expect(screen.getByText('Analysis')).toBeInTheDocument();
    });

    it('should not render capabilities section when capabilities are empty', () => {
      // Arrange
      mockAgent.capabilities = [];

      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.queryByText('Technical Capabilities')).not.toBeInTheDocument();
    });
  });

  describe('Programming Languages Section', () => {
    it('should render programming languages when available', () => {
      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Programming Languages')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    it('should not render languages section when languages are empty', () => {
      // Arrange
      mockAgent.metadata = { ...mockAgent.metadata!, languages: [] };

      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.queryByText('Programming Languages')).not.toBeInTheDocument();
    });

    it('should not render languages section when metadata is undefined', () => {
      // Arrange
      mockAgent.metadata = undefined;

      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.queryByText('Programming Languages')).not.toBeInTheDocument();
    });
  });

  describe('Limitations Section', () => {
    it('should render limitations when available', () => {
      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Limitations & Considerations')).toBeInTheDocument();
      expect(screen.getByText('Requires clear test specifications')).toBeInTheDocument();
      expect(screen.getByText('Limited to programmatic testing')).toBeInTheDocument();
      expect(screen.getByText('Cannot test physical interfaces')).toBeInTheDocument();
    });

    it('should not render limitations section when limitations are empty', () => {
      // Arrange
      mockAgent.profile = { ...mockAgent.profile!, limitations: [] };

      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.queryByText('Limitations & Considerations')).not.toBeInTheDocument();
    });
  });

  describe('External Resources Section', () => {
    it('should render external resources when repository and documentation are available', () => {
      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('External Resources')).toBeInTheDocument();
      
      const repositoryLink = screen.getByRole('link', { name: /repository/i });
      expect(repositoryLink).toHaveAttribute('href', 'https://github.com/sparc/agents');
      expect(repositoryLink).toHaveAttribute('target', '_blank');
      
      const documentationLink = screen.getByRole('link', { name: /documentation/i });
      expect(documentationLink).toHaveAttribute('href', 'https://docs.sparc.ai/agents');
      expect(documentationLink).toHaveAttribute('target', '_blank');
    });

    it('should not render external resources section when no external links are available', () => {
      // Arrange
      mockAgent.metadata = { 
        ...mockAgent.metadata!, 
        repository: undefined, 
        documentation: undefined 
      };

      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.queryByText('External Resources')).not.toBeInTheDocument();
    });

    it('should render only available external resources', () => {
      // Arrange
      mockAgent.metadata = { 
        ...mockAgent.metadata!, 
        documentation: undefined 
      };

      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('External Resources')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /repository/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /documentation/i })).not.toBeInTheDocument();
    });
  });

  describe('Additional Information Section', () => {
    it('should display metadata information correctly', () => {
      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Additional Information')).toBeInTheDocument();
      expect(screen.getByText('SPARC Team')).toBeInTheDocument(); // Author
      expect(screen.getByText('MIT')).toBeInTheDocument(); // License
      expect(screen.getByText('5.00 MB')).toBeInTheDocument(); // Total size (assuming size: 5242880)
    });

    it('should format dates correctly', () => {
      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('1/1/2024')).toBeInTheDocument(); // Created date
      expect(screen.getByText('12/1/2024')).toBeInTheDocument(); // Last updated/active date
    });

    it('should handle missing metadata gracefully', () => {
      // Arrange
      mockAgent.metadata = {};
      mockAgent.createdAt = undefined;
      mockAgent.lastActiveAt = undefined;

      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert - Should still render the section but without the missing data
      expect(screen.getByText('Additional Information')).toBeInTheDocument();
      expect(screen.queryByText('SPARC Team')).not.toBeInTheDocument();
      expect(screen.queryByText('MIT')).not.toBeInTheDocument();
    });
  });

  describe('Agent Category Display', () => {
    it('should display agent category when available', () => {
      // Arrange
      mockAgent.category = 'Development Tools';

      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Development Tools')).toBeInTheDocument();
    });

    it('should not display category section when category is undefined', () => {
      // Arrange
      mockAgent.category = undefined;

      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.queryByText('Category:')).not.toBeInTheDocument();
    });
  });

  describe('Statistics Calculations', () => {
    it('should handle zero values in statistics', () => {
      // Arrange
      mockAgent.capabilities = [];
      mockAgent.metadata = { ...mockAgent.metadata!, fileCount: 0, languages: [] };
      mockAgent.version = undefined;

      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      const statsSection = screen.getByTestId('agent-statistics');
      expect(statsSection).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // Capabilities
      expect(screen.getByText('v1.0.0')).toBeInTheDocument(); // Default version
    });

    it('should calculate statistics correctly with large numbers', () => {
      // Arrange
      mockAgent.capabilities = new Array(100).fill('capability');
      mockAgent.metadata = { ...mockAgent.metadata!, fileCount: 9999, languages: new Array(50).fill('lang') };

      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('100')).toBeInTheDocument(); // Capabilities
      expect(screen.getByText('9999')).toBeInTheDocument(); // Files
      expect(screen.getByText('50')).toBeInTheDocument(); // Languages
    });
  });

  describe('Error Handling', () => {
    it('should handle missing profile data gracefully', () => {
      // Arrange
      mockAgent.profile = undefined;

      // Act & Assert - Should not throw
      expect(() => render(<AgentProfileTab agent={mockAgent} />)).not.toThrow();
    });

    it('should handle empty agent object gracefully', () => {
      // Arrange
      const emptyAgent = {} as UnifiedAgentData;

      // Act & Assert - Should not throw
      expect(() => render(<AgentProfileTab agent={emptyAgent} />)).not.toThrow();
    });

    it('should handle malformed metadata gracefully', () => {
      // Arrange
      mockAgent.metadata = null as any;

      // Act & Assert - Should not throw
      expect(() => render(<AgentProfileTab agent={mockAgent} />)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Check for main section headings
      expect(screen.getByRole('heading', { name: /purpose & mission/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /agent statistics/i })).toBeInTheDocument();
    });

    it('should have accessible link attributes for external resources', () => {
      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      const repositoryLink = screen.getByRole('link', { name: /repository/i });
      expect(repositoryLink).toHaveAttribute('rel', 'noopener noreferrer');
      
      const documentationLink = screen.getByRole('link', { name: /documentation/i });
      expect(documentationLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should have descriptive text for screen readers', () => {
      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Key areas where this agent excels and delivers exceptional performance')).toBeInTheDocument();
      expect(screen.getByText('Practical scenarios where this agent can be effectively utilized')).toBeInTheDocument();
      expect(screen.getByText('Important considerations and current limitations to be aware of')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render grid layouts for different screen sizes', () => {
      // Act
      render(<AgentProfileTab agent={mockAgent} />);

      // Assert - Check for grid CSS classes that handle responsive design
      const strengthsGrid = screen.getByTestId('agent-strengths');
      expect(strengthsGrid.className).toMatch(/grid/);
      
      const useCasesGrid = screen.getByTestId('agent-use-cases');
      expect(useCasesGrid.className).toMatch(/grid/);
    });
  });
});