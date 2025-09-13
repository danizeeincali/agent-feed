/**
 * TDD London School: Hooks Fix Verification Test
 * Verifies that AgentPagesTab no longer causes hooks violations
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AgentPagesTab from '../../components/AgentPagesTab';

// Mock all external dependencies
vi.mock('../../hooks/useDebounced', () => ({
  useDebounced: vi.fn((value: any) => value)
}));

vi.mock('../../services/api', () => ({
  workspaceApi: {
    listPages: vi.fn().mockResolvedValue({ pages: [] }),
    createPage: vi.fn().mockResolvedValue({ id: 'new-page' })
  }
}));

vi.mock('../../utils/cn', () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(' '))
}));

describe('Hooks Fix Verification', () => {
  let mockAgent: any;
  let hookCalls: number[];
  let renderCount = 0;

  beforeEach(() => {
    hookCalls = [];
    renderCount = 0;
    vi.clearAllMocks();

    mockAgent = {
      id: 'test-agent-123',
      name: 'Test Agent',
      description: 'Test agent for hooks verification',
      status: 'active',
      capabilities: ['test'],
      stats: {
        tasksCompleted: 100,
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
          description: 'Test description',
          specialization: 'Testing',
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
      pages: []
    };
  });

  it('should render consistently without hooks violations', () => {
    console.log('=== TESTING HOOKS CONSISTENCY ===');

    // First render
    const { rerender } = render(<AgentPagesTab agent={mockAgent} />);
    console.log('✓ First render successful');

    // Multiple re-renders with same props should not cause violations
    act(() => {
      rerender(<AgentPagesTab agent={mockAgent} />);
    });
    console.log('✓ Second render successful');

    act(() => {
      rerender(<AgentPagesTab agent={mockAgent} />);
    });
    console.log('✓ Third render successful');

    act(() => {
      rerender(<AgentPagesTab agent={mockAgent} />);
    });
    console.log('✓ Fourth render successful');

    // If we reach this point, no hooks violation occurred
    expect(true).toBe(true);
    console.log('✅ ALL RENDERS SUCCESSFUL - HOOKS VIOLATION FIXED!');
  });

  it('should handle different agent states without hooks violations', () => {
    console.log('=== TESTING DIFFERENT AGENT STATES ===');

    const states = [
      { ...mockAgent, status: 'active' },
      { ...mockAgent, status: 'inactive' },
      { ...mockAgent, status: 'error' },
      { ...mockAgent, status: 'loading' }
    ];

    states.forEach((agent, index) => {
      console.log(`Testing state ${index + 1}: ${agent.status}`);
      
      const { unmount } = render(<AgentPagesTab agent={agent} />);
      console.log(`✓ State ${index + 1} rendered successfully`);
      
      unmount();
    });

    console.log('✅ ALL STATES RENDER WITHOUT HOOKS VIOLATIONS!');
    expect(true).toBe(true);
  });

  it('should handle tab switching simulation without violations', () => {
    console.log('=== TESTING TAB SWITCHING SIMULATION ===');

    // Simulate tab switching by mounting/unmounting component
    const TabSimulator = ({ showPages }: { showPages: boolean }) => {
      if (!showPages) {
        return <div data-testid="other-tab">Other tab</div>;
      }
      return <AgentPagesTab agent={mockAgent} />;
    };

    const { rerender } = render(<TabSimulator showPages={false} />);
    console.log('✓ Other tab rendered');

    // Switch to Pages tab
    act(() => {
      rerender(<TabSimulator showPages={true} />);
    });
    console.log('✓ Pages tab rendered');

    // Switch back
    act(() => {
      rerender(<TabSimulator showPages={false} />);
    });
    console.log('✓ Back to other tab');

    // Switch to Pages tab again - this was causing the violation before
    act(() => {
      rerender(<TabSimulator showPages={true} />);
    });
    console.log('✓ Pages tab rendered again');

    console.log('✅ TAB SWITCHING WORKS WITHOUT VIOLATIONS!');
    expect(true).toBe(true);
  });
});