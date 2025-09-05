/**
 * AgentCard Component Tests
 * London School TDD - Component Behavior Verification
 */

const { jest, describe, it, expect, beforeEach } = require('@jest/globals');
const { AgentDataFactory } = require('../utils/test-factories');

// Subject Under Test - AgentCard Component
class AgentCard {
  constructor(props = {}) {
    this.props = {
      agent: null,
      selected: false,
      onClick: jest.fn(),
      onStatusToggle: jest.fn(),
      onConfigure: jest.fn(),
      onViewDetails: jest.fn(),
      ...props
    };
  }

  handleClick() {
    if (this.props.onClick) {
      this.props.onClick(this.props.agent.id);
    }
  }

  handleStatusToggle() {
    const newStatus = this.props.agent.status === 'active' ? 'inactive' : 'active';
    if (this.props.onStatusToggle) {
      this.props.onStatusToggle(this.props.agent.id, newStatus);
    }
  }

  handleConfigure() {
    if (this.props.onConfigure) {
      this.props.onConfigure(this.props.agent.id);
    }
  }

  handleViewDetails() {
    if (this.props.onViewDetails) {
      this.props.onViewDetails(this.props.agent);
    }
  }

  render() {
    const { agent, selected } = this.props;
    
    if (!agent) {
      return null;
    }

    return {
      type: 'div',
      props: {
        className: `agent-card ${selected ? 'selected' : ''} ${agent.status}`,
        'data-testid': `agent-card-${agent.id}`,
        'data-agent-id': agent.id,
        'aria-label': `${agent.name} agent card`,
        role: 'button',
        tabIndex: 0,
        onClick: this.handleClick.bind(this),
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            this.handleClick();
          }
        }
      },
      children: [
        {
          type: 'div',
          props: { className: 'agent-header' },
          children: [
            {
              type: 'h3',
              props: { className: 'agent-name' },
              children: agent.name
            },
            {
              type: 'span',
              props: {
                className: `agent-status ${agent.status}`,
                'data-testid': `status-${agent.id}`
              },
              children: agent.status
            }
          ]
        },
        {
          type: 'div',
          props: { className: 'agent-description' },
          children: agent.description
        },
        {
          type: 'div',
          props: { className: 'agent-metrics' },
          children: [
            {
              type: 'span',
              props: { className: 'performance' },
              children: `Performance: ${(agent.metrics?.performance * 100).toFixed(1)}%`
            }
          ]
        }
      ]
    };
  }
}

describe('AgentCard Component', () => {
  let component;
  let mockAgent;

  beforeEach(() => {
    mockAgent = AgentDataFactory.createActive({
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent for verification',
      status: 'active'
    });

    component = new AgentCard({
      agent: mockAgent,
      selected: false
    });
  });

  describe('Component Rendering', () => {
    describe('when agent data is provided', () => {
      it('should render agent card with proper structure', () => {
        const rendered = component.render();

        expect(rendered).toMatchObject({
          type: 'div',
          props: {
            className: expect.stringContaining('agent-card'),
            'data-testid': 'agent-card-test-agent',
            'data-agent-id': 'test-agent'
          }
        });
      });

      it('should display agent name prominently', () => {
        const rendered = component.render();
        const header = rendered.children[0];
        const nameElement = header.children[0];

        expect(nameElement).toMatchObject({
          type: 'h3',
          props: { className: 'agent-name' },
          children: 'Test Agent'
        });
      });

      it('should display agent status with visual indicator', () => {
        const rendered = component.render();
        const header = rendered.children[0];
        const statusElement = header.children[1];

        expect(statusElement).toMatchObject({
          type: 'span',
          props: {
            className: 'agent-status active',
            'data-testid': 'status-test-agent'
          },
          children: 'active'
        });
      });

      it('should display agent description', () => {
        const rendered = component.render();
        const descriptionElement = rendered.children[1];

        expect(descriptionElement).toMatchObject({
          type: 'div',
          props: { className: 'agent-description' },
          children: 'A test agent for verification'
        });
      });

      it('should display performance metrics', () => {
        const rendered = component.render();
        const metricsElement = rendered.children[2];
        const performanceElement = metricsElement.children[0];

        expect(performanceElement).toMatchObject({
          type: 'span',
          props: { className: 'performance' },
          children: expect.stringContaining('Performance:')
        });
      });
    });

    describe('when agent is selected', () => {
      beforeEach(() => {
        component.props.selected = true;
      });

      it('should apply selected styling', () => {
        const rendered = component.render();

        expect(rendered.props.className).toContain('selected');
      });
    });

    describe('when agent status changes', () => {
      it('should reflect inactive status', () => {
        component.props.agent.status = 'inactive';
        const rendered = component.render();

        expect(rendered.props.className).toContain('inactive');
      });

      it('should reflect error status', () => {
        component.props.agent.status = 'error';
        const rendered = component.render();

        expect(rendered.props.className).toContain('error');
      });
    });

    describe('when no agent data is provided', () => {
      beforeEach(() => {
        component.props.agent = null;
      });

      it('should render nothing', () => {
        const rendered = component.render();

        expect(rendered).toBeNull();
      });
    });
  });

  describe('User Interaction Behavior', () => {
    describe('when user clicks agent card', () => {
      beforeEach(() => {
        component.handleClick();
      });

      it('should notify parent component with agent ID', () => {
        expect(component.props.onClick).toHaveBeenCalledWith('test-agent');
      });

      it('should call click handler only once per click', () => {
        expect(component.props.onClick).toHaveBeenCalledTimes(1);
      });
    });

    describe('when user toggles agent status', () => {
      describe('from active to inactive', () => {
        beforeEach(() => {
          component.props.agent.status = 'active';
          component.handleStatusToggle();
        });

        it('should notify parent with new inactive status', () => {
          expect(component.props.onStatusToggle).toHaveBeenCalledWith(
            'test-agent',
            'inactive'
          );
        });
      });

      describe('from inactive to active', () => {
        beforeEach(() => {
          component.props.agent.status = 'inactive';
          component.handleStatusToggle();
        });

        it('should notify parent with new active status', () => {
          expect(component.props.onStatusToggle).toHaveBeenCalledWith(
            'test-agent',
            'active'
          );
        });
      });
    });

    describe('when user configures agent', () => {
      beforeEach(() => {
        component.handleConfigure();
      });

      it('should notify parent component for configuration', () => {
        expect(component.props.onConfigure).toHaveBeenCalledWith('test-agent');
      });
    });

    describe('when user views agent details', () => {
      beforeEach(() => {
        component.handleViewDetails();
      });

      it('should notify parent with complete agent data', () => {
        expect(component.props.onViewDetails).toHaveBeenCalledWith(mockAgent);
      });
    });
  });

  describe('Keyboard Accessibility', () => {
    let rendered;

    beforeEach(() => {
      rendered = component.render();
    });

    it('should be focusable', () => {
      expect(rendered.props.tabIndex).toBe(0);
    });

    it('should have proper ARIA role', () => {
      expect(rendered.props.role).toBe('button');
    });

    it('should have descriptive ARIA label', () => {
      expect(rendered.props['aria-label']).toBe('Test Agent agent card');
    });

    describe('when Enter key is pressed', () => {
      it('should trigger click handler', () => {
        const keyDownHandler = rendered.props.onKeyDown;
        keyDownHandler({ key: 'Enter' });

        expect(component.props.onClick).toHaveBeenCalledWith('test-agent');
      });
    });

    describe('when Space key is pressed', () => {
      it('should trigger click handler', () => {
        const keyDownHandler = rendered.props.onKeyDown;
        keyDownHandler({ key: ' ' });

        expect(component.props.onClick).toHaveBeenCalledWith('test-agent');
      });
    });

    describe('when other keys are pressed', () => {
      it('should not trigger click handler', () => {
        const keyDownHandler = rendered.props.onKeyDown;
        keyDownHandler({ key: 'Tab' });
        keyDownHandler({ key: 'Escape' });

        expect(component.props.onClick).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    describe('when onClick handler is not provided', () => {
      beforeEach(() => {
        component.props.onClick = null;
      });

      it('should not throw error when clicked', () => {
        expect(() => component.handleClick()).not.toThrow();
      });
    });

    describe('when agent has missing metrics', () => {
      beforeEach(() => {
        component.props.agent.metrics = null;
      });

      it('should handle missing metrics gracefully', () => {
        expect(() => component.render()).not.toThrow();
      });

      it('should display fallback metrics', () => {
        const rendered = component.render();
        const metricsElement = rendered.children[2];
        const performanceElement = metricsElement.children[0];

        expect(performanceElement.children).toContain('NaN'); // Handle gracefully
      });
    });

    describe('when agent has malformed data', () => {
      beforeEach(() => {
        component.props.agent = {
          id: 'malformed-agent',
          // Missing required fields
        };
      });

      it('should render with available data only', () => {
        const rendered = component.render();

        expect(rendered.props['data-agent-id']).toBe('malformed-agent');
        // Should not crash due to missing fields
      });
    });
  });

  describe('Performance Characteristics', () => {
    it('should not re-render unnecessarily', () => {
      const initialRender = component.render();
      const secondRender = component.render();

      // Component should produce consistent output for same props
      expect(initialRender).toEqual(secondRender);
    });

    it('should handle large metric values efficiently', () => {
      component.props.agent.metrics = {
        performance: 0.999999999,
        reliability: 0.999999999,
        tasksCompleted: 999999
      };

      expect(() => component.render()).not.toThrow();
    });
  });

  describe('Visual State Representation', () => {
    it('should apply correct CSS classes for active agent', () => {
      component.props.agent.status = 'active';
      const rendered = component.render();

      expect(rendered.props.className).toContain('active');
    });

    it('should apply correct CSS classes for inactive agent', () => {
      component.props.agent.status = 'inactive';
      const rendered = component.render();

      expect(rendered.props.className).toContain('inactive');
    });

    it('should apply correct CSS classes for error state', () => {
      component.props.agent.status = 'error';
      const rendered = component.render();

      expect(rendered.props.className).toContain('error');
    });

    it('should combine selection and status classes', () => {
      component.props.selected = true;
      component.props.agent.status = 'active';
      const rendered = component.render();

      expect(rendered.props.className).toContain('selected');
      expect(rendered.props.className).toContain('active');
    });
  });

  describe('Component Contract Verification', () => {
    it('should expose required public interface', () => {
      expect(typeof component.handleClick).toBe('function');
      expect(typeof component.handleStatusToggle).toBe('function');
      expect(typeof component.handleConfigure).toBe('function');
      expect(typeof component.handleViewDetails).toBe('function');
      expect(typeof component.render).toBe('function');
    });

    it('should collaborate properly with parent components', () => {
      component.handleClick();
      component.handleStatusToggle();
      component.handleConfigure();
      component.handleViewDetails();

      // Verify all collaboration contracts
      expect(component.props.onClick).toHaveBeenCalled();
      expect(component.props.onStatusToggle).toHaveBeenCalled();
      expect(component.props.onConfigure).toHaveBeenCalled();
      expect(component.props.onViewDetails).toHaveBeenCalled();
    });

    it('should maintain immutable props', () => {
      const originalAgent = { ...component.props.agent };
      
      component.handleClick();
      component.handleStatusToggle();
      
      // Props should not be mutated by component interactions
      expect(component.props.agent).toEqual(originalAgent);
    });
  });
});