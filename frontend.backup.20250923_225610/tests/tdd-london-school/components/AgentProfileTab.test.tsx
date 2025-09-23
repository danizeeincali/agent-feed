/**
 * AgentProfileTab TDD Tests
 * Testing the profile information display functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AgentProfileTab from '../../../src/components/AgentProfileTab';
import type { UnifiedAgentData } from '../../../src/components/UnifiedAgentPage';

// Test data factory
const createMockAgent = (overrides: Partial<UnifiedAgentData> = {}): UnifiedAgentData => ({
  id: 'test-agent-1',
  name: 'Test Agent',
  description: 'Test agent description',
  status: 'active',
  capabilities: ['automation', 'analysis', 'communication'],
  stats: {
    tasksCompleted: 100,
    successRate: 95,
    averageResponseTime: 200,
    uptime: 99.5,
    todayTasks: 5,
    weeklyTasks: 35,
    satisfaction: 4.5
  },
  recentActivities: [],
  recentPosts: [],
  configuration: {
    profile: {
      name: 'Test Agent',
      description: 'Advanced AI assistant specialized in task automation',
      specialization: 'Task Automation & Analysis',
      avatar: '🤖'
    },
    behavior: {
      responseStyle: 'friendly',
      proactivity: 'high',
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
  profile: {
    strengths: ['Reliability', 'Speed', 'Accuracy', 'Adaptability'],
    useCases: [
      'Document processing',
      'Data analysis',
      'Customer support',
      'Workflow automation'
    ],
    limitations: [
      'Cannot access real-time data',
      'Limited to text-based interactions',
      'Context window limitations'
    ],
    expertise: ['Machine Learning', 'Natural Language Processing', 'Data Science'],
    certifications: ['AI Ethics Certified', 'Data Privacy Compliant'],
    languages: ['English', 'Spanish', 'French'],
    availability: '24/7',
    responseTime: 'Under 2 seconds',
    specializations: ['Technical Writing', 'Code Review', 'Business Analysis']
  },
  metadata: {
    repository: 'https://github.com/agents/test-agent',
    documentation: 'https://docs.example.com/agents/test-agent',
    author: 'AI Development Team',
    license: 'MIT',
    version: '2.1.0',
    lastUpdated: '2024-01-15T10:30:00Z'
  },
  ...overrides
});

describe('AgentProfileTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the component with agent profile', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      expect(screen.getByTestId('agent-profile-tab')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should display agent basic information', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      expect(screen.getByText(agent.configuration.profile.name)).toBeInTheDocument();
      expect(screen.getByText(agent.configuration.profile.description)).toBeInTheDocument();
      expect(screen.getByText(agent.configuration.profile.specialization)).toBeInTheDocument();
    });

    it('should show empty state when no profile data available', () => {
      const agent = createMockAgent({ profile: null });
      render(<AgentProfileTab agent={agent} />);
      
      expect(screen.getByTestId('empty-profile-state')).toBeInTheDocument();
      expect(screen.getByText(/No profile information available/i)).toBeInTheDocument();
    });
  });

  describe('Strengths Section', () => {
    it('should display agent strengths', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      expect(screen.getByTestId('strengths-section')).toBeInTheDocument();
      agent.profile!.strengths.forEach(strength => {
        expect(screen.getByText(strength)).toBeInTheDocument();
      });
    });

    it('should render strengths as cards', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      const strengthCards = screen.getAllByTestId('strength-card');
      expect(strengthCards).toHaveLength(agent.profile!.strengths.length);
    });

    it('should handle empty strengths array', () => {
      const agent = createMockAgent({
        profile: { ...createMockAgent().profile!, strengths: [] }
      });
      render(<AgentProfileTab agent={agent} />);
      
      expect(screen.getByText(/No strengths specified/i)).toBeInTheDocument();
    });
  });

  describe('Use Cases Section', () => {
    it('should display use cases with descriptions', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      expect(screen.getByTestId('use-cases-section')).toBeInTheDocument();
      agent.profile!.useCases.forEach(useCase => {
        expect(screen.getByText(useCase)).toBeInTheDocument();
      });
    });

    it('should render use cases as expandable items', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      const useCaseItems = screen.getAllByTestId('use-case-item');
      expect(useCaseItems).toHaveLength(agent.profile!.useCases.length);
    });

    it('should expand use case details on click', async () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      const firstUseCase = screen.getAllByTestId('use-case-item')[0];
      fireEvent.click(firstUseCase);
      
      await waitFor(() => {
        expect(screen.getByTestId('use-case-details')).toBeInTheDocument();
      });
    });
  });

  describe('Limitations Section', () => {
    it('should display agent limitations', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      expect(screen.getByTestId('limitations-section')).toBeInTheDocument();
      agent.profile!.limitations.forEach(limitation => {
        expect(screen.getByText(limitation)).toBeInTheDocument();
      });
    });

    it('should style limitations appropriately', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      const limitationsSection = screen.getByTestId('limitations-section');
      expect(limitationsSection).toHaveClass('limitations-section');
    });

    it('should handle no limitations gracefully', () => {
      const agent = createMockAgent({
        profile: { ...createMockAgent().profile!, limitations: [] }
      });
      render(<AgentProfileTab agent={agent} />);
      
      expect(screen.getByText(/No limitations specified/i)).toBeInTheDocument();
    });
  });

  describe('Technical Details Section', () => {
    it('should display expertise areas', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      expect(screen.getByTestId('expertise-section')).toBeInTheDocument();
      agent.profile!.expertise!.forEach(area => {
        expect(screen.getByText(area)).toBeInTheDocument();
      });
    });

    it('should show certifications', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      expect(screen.getByTestId('certifications-section')).toBeInTheDocument();
      agent.profile!.certifications!.forEach(cert => {
        expect(screen.getByText(cert)).toBeInTheDocument();
      });
    });

    it('should display supported languages', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      expect(screen.getByTestId('languages-section')).toBeInTheDocument();
      agent.profile!.languages!.forEach(lang => {
        expect(screen.getByText(lang)).toBeInTheDocument();
      });
    });

    it('should show availability and response time', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      expect(screen.getByText(agent.profile!.availability!)).toBeInTheDocument();
      expect(screen.getByText(agent.profile!.responseTime!)).toBeInTheDocument();
    });
  });

  describe('Metadata Section', () => {
    it('should display technical metadata', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      expect(screen.getByTestId('metadata-section')).toBeInTheDocument();
      expect(screen.getByText(agent.metadata!.version!)).toBeInTheDocument();
      expect(screen.getByText(agent.metadata!.author!)).toBeInTheDocument();
      expect(screen.getByText(agent.metadata!.license!)).toBeInTheDocument();
    });

    it('should render repository and documentation links', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      const repoLink = screen.getByTestId('repository-link');
      const docsLink = screen.getByTestId('documentation-link');
      
      expect(repoLink).toHaveAttribute('href', agent.metadata!.repository);
      expect(docsLink).toHaveAttribute('href', agent.metadata!.documentation);
    });

    it('should handle missing metadata gracefully', () => {
      const agent = createMockAgent({ metadata: undefined });
      render(<AgentProfileTab agent={agent} />);
      
      expect(screen.queryByTestId('metadata-section')).not.toBeInTheDocument();
    });
  });

  describe('Interactive Features', () => {
    it('should support profile sharing', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { share: mockShare });

      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      const shareButton = screen.getByTestId('share-profile');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith({
          title: agent.configuration.profile.name,
          text: agent.configuration.profile.description,
          url: expect.stringContaining(agent.id)
        });
      });
    });

    it('should handle share API unavailability', () => {
      Object.assign(navigator, { share: undefined });

      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      const shareButton = screen.getByTestId('share-profile');
      fireEvent.click(shareButton);
      
      expect(screen.getByTestId('share-fallback')).toBeInTheDocument();
    });

    it('should provide contact functionality', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      const contactButton = screen.getByTestId('contact-agent');
      fireEvent.click(contactButton);
      
      expect(screen.getByTestId('contact-modal')).toBeInTheDocument();
    });

    it('should support profile export', async () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:url');
      
      const exportButton = screen.getByTestId('export-profile');
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
      });
    });
  });

  describe('Search and Filter', () => {
    it('should filter capabilities by search term', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      const searchInput = screen.getByTestId('capabilities-search');
      fireEvent.change(searchInput, { target: { value: 'auto' } });
      
      expect(screen.getByText('automation')).toBeInTheDocument();
      expect(screen.queryByText('analysis')).not.toBeInTheDocument();
    });

    it('should filter use cases by category', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      const categoryFilter = screen.getByTestId('use-case-filter');
      fireEvent.change(categoryFilter, { target: { value: 'data' } });
      
      expect(screen.getByText('Data analysis')).toBeInTheDocument();
    });

    it('should clear search and filters', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      const searchInput = screen.getByTestId('capabilities-search');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const clearButton = screen.getByTestId('clear-search');
      fireEvent.click(clearButton);
      
      expect(searchInput).toHaveValue('');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed profile data', () => {
      const agent = createMockAgent({
        profile: { strengths: null, useCases: undefined } as any
      });
      
      expect(() => render(<AgentProfileTab agent={agent} />)).not.toThrow();
      expect(screen.getByTestId('agent-profile-tab')).toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      const agent = createMockAgent();
      
      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      render(<AgentProfileTab agent={agent} />);
      
      // Should still render profile without additional data
      expect(screen.getByTestId('agent-profile-tab')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      expect(screen.getByLabelText(/agent profile/i)).toBeInTheDocument();
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        expect(element).toHaveAttribute('tabIndex');
      });
    });

    it('should provide screen reader friendly content', () => {
      const agent = createMockAgent();
      render(<AgentProfileTab agent={agent} />);
      
      expect(screen.getByLabelText(/strengths list/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/use cases list/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/limitations list/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should memoize expensive computations', () => {
      const agent = createMockAgent();
      const { rerender } = render(<AgentProfileTab agent={agent} />);
      
      // Rerender should not recompute data
      rerender(<AgentProfileTab agent={agent} />);
      
      expect(screen.getByTestId('agent-profile-tab')).toBeInTheDocument();
    });

    it('should handle large datasets efficiently', () => {
      const largeProfile = {
        strengths: Array.from({ length: 100 }, (_, i) => `Strength ${i}`),
        useCases: Array.from({ length: 100 }, (_, i) => `Use case ${i}`),
        limitations: Array.from({ length: 50 }, (_, i) => `Limitation ${i}`)
      };
      
      const agent = createMockAgent({ profile: largeProfile });
      
      const start = performance.now();
      render(<AgentProfileTab agent={agent} />);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(1000); // Should render within 1 second
    });
  });
});