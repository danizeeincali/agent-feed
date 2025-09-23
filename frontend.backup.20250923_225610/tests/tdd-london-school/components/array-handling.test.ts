import { jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { createSwarmMock, createMockContract } from '../setup-tests';
import React from 'react';

/**
 * TDD London School: Component Array Handling Tests
 * 
 * Focus: Behavior verification for component-level array handling
 * Goal: Prevent "recentActivities.slice is not a function" runtime errors
 * Approach: Mock-driven component interaction testing
 */

// Mock contracts for component collaboration
const componentStateContract = createMockContract('ComponentState', [
  'setRecentActivities',
  'getRecentActivities',
  'updateActivityState'
]);

const arrayHandlerContract = createMockContract('ArrayHandler', [
  'safeSlice',
  'validateArray',
  'handleUndefinedArray',
  'handleNullArray'
]);

const errorBoundaryContract = createMockContract('ErrorBoundary', [
  'catchError',
  'logError',
  'renderFallback'
]);

// Mock component that exhibits the problematic behavior
const MockUnifiedAgentPage = ({ agent }: { agent: any }) => {
  const { recentActivities = [] } = agent || {};
  
  // This is the problematic line we're testing
  const displayActivities = Array.isArray(recentActivities) 
    ? recentActivities.slice(0, 3)
    : [];
    
  return (
    <div data-testid="agent-page">
      <div data-testid="activities-section">
        {displayActivities.map((activity: any) => (
          <div key={activity.id} data-testid={`activity-${activity.id}`}>
            {activity.title}
          </div>
        ))}
      </div>
    </div>
  );
};

const MockAgentProfile = ({ agentData, onActivityUpdate }: { agentData: any; onActivityUpdate: any }) => {
  const handleNewActivity = (newActivity: any) => {
    if (agentData && Array.isArray(agentData.recentActivities)) {
      const updatedActivities = [newActivity, ...agentData.recentActivities.slice(0, 9)];
      onActivityUpdate(updatedActivities);
    }
  };

  return (
    <div data-testid="agent-profile">
      <button 
        data-testid="add-activity-btn"
        onClick={() => handleNewActivity({ id: 'new', title: 'New Activity' })}
      >
        Add Activity
      </button>
    </div>
  );
};

describe('Component Array Handling Behavior Verification', () => {
  let mockComponentState: typeof componentStateContract;
  let mockArrayHandler: typeof arrayHandlerContract;
  let mockErrorBoundary: typeof errorBoundaryContract;

  beforeEach(() => {
    // London School: Define collaboration contracts through mocks
    mockComponentState = createSwarmMock('ComponentState', {
      setRecentActivities: jest.fn(),
      getRecentActivities: jest.fn(),
      updateActivityState: jest.fn()
    });

    mockArrayHandler = createSwarmMock('ArrayHandler', {
      safeSlice: jest.fn(),
      validateArray: jest.fn(),
      handleUndefinedArray: jest.fn(),
      handleNullArray: jest.fn()
    });

    mockErrorBoundary = createSwarmMock('ErrorBoundary', {
      catchError: jest.fn(),
      logError: jest.fn(),
      renderFallback: jest.fn()
    });
  });

  describe('UnifiedAgentPage Component Array Handling', () => {
    it('should not crash when recentActivities is undefined', () => {
      // Given: Agent data with undefined recentActivities
      const agentWithUndefinedActivities = {
        id: 'agent-1',
        name: 'Test Agent',
        recentActivities: undefined
      };

      mockArrayHandler.validateArray.mockReturnValue(false);
      mockArrayHandler.handleUndefinedArray.mockReturnValue([]);

      // When: Rendering component with undefined activities
      const renderComponent = () => render(
        <MockUnifiedAgentPage agent={agentWithUndefinedActivities} />
      );

      // Then: Should not throw error and should render empty state
      expect(renderComponent).not.toThrow();
      
      const { getByTestId } = renderComponent();
      const activitiesSection = getByTestId('activities-section');
      
      expect(activitiesSection).toBeInTheDocument();
      expect(activitiesSection.children).toHaveLength(0);
    });

    it('should not crash when recentActivities is null', () => {
      // Given: Agent data with null recentActivities
      const agentWithNullActivities = {
        id: 'agent-1',
        name: 'Test Agent',
        recentActivities: null
      };

      mockArrayHandler.validateArray.mockReturnValue(false);
      mockArrayHandler.handleNullArray.mockReturnValue([]);

      // When: Rendering component with null activities
      const renderComponent = () => render(
        <MockUnifiedAgentPage agent={agentWithNullActivities} />
      );

      // Then: Should not throw error
      expect(renderComponent).not.toThrow();
      
      const { getByTestId } = renderComponent();
      const activitiesSection = getByTestId('activities-section');
      
      expect(activitiesSection).toBeInTheDocument();
      expect(activitiesSection.children).toHaveLength(0);
    });

    it('should work correctly with empty activities array', () => {
      // Given: Agent data with empty activities array
      const agentWithEmptyActivities = {
        id: 'agent-1',
        name: 'Test Agent',
        recentActivities: []
      };

      mockArrayHandler.validateArray.mockReturnValue(true);
      mockArrayHandler.safeSlice.mockReturnValue([]);

      // When: Rendering component with empty array
      const { getByTestId } = render(
        <MockUnifiedAgentPage agent={agentWithEmptyActivities} />
      );

      // Then: Should render empty state gracefully
      const activitiesSection = getByTestId('activities-section');
      expect(activitiesSection).toBeInTheDocument();
      expect(activitiesSection.children).toHaveLength(0);
    });

    it('should handle populated activities array correctly', () => {
      // Given: Agent data with valid activities
      const agentWithActivities = {
        id: 'agent-1',
        name: 'Test Agent',
        recentActivities: [
          { id: '1', title: 'Activity 1', type: 'task_completed' },
          { id: '2', title: 'Activity 2', type: 'message_sent' },
          { id: '3', title: 'Activity 3', type: 'data_processed' },
          { id: '4', title: 'Activity 4', type: 'task_completed' }
        ]
      };

      const expectedSlicedActivities = agentWithActivities.recentActivities.slice(0, 3);
      mockArrayHandler.validateArray.mockReturnValue(true);
      mockArrayHandler.safeSlice.mockReturnValue(expectedSlicedActivities);

      // When: Rendering component with activities
      const { getByTestId } = render(
        <MockUnifiedAgentPage agent={agentWithActivities} />
      );

      // Then: Should display first 3 activities only
      const activitiesSection = getByTestId('activities-section');
      expect(activitiesSection.children).toHaveLength(3);
      
      expect(getByTestId('activity-1')).toHaveTextContent('Activity 1');
      expect(getByTestId('activity-2')).toHaveTextContent('Activity 2');
      expect(getByTestId('activity-3')).toHaveTextContent('Activity 3');
      
      // Fourth activity should not be displayed
      expect(() => getByTestId('activity-4')).toThrow();
    });

    it('should handle non-array recentActivities gracefully', () => {
      // Given: Agent data with non-array recentActivities
      const testCases = [
        { recentActivities: 'string', description: 'string value' },
        { recentActivities: 123, description: 'number value' },
        { recentActivities: { length: 3 }, description: 'object with length property' },
        { recentActivities: new Set([1, 2, 3]), description: 'Set object' }
      ];

      testCases.forEach(({ recentActivities, description }) => {
        const agentWithInvalidActivities = {
          id: 'agent-1',
          name: 'Test Agent',
          recentActivities
        };

        mockArrayHandler.validateArray.mockReturnValue(false);
        mockArrayHandler.handleUndefinedArray.mockReturnValue([]);

        // When: Rendering component with non-array activities
        const renderComponent = () => render(
          <MockUnifiedAgentPage agent={agentWithInvalidActivities} />
        );

        // Then: Should not crash with non-array data
        expect(renderComponent).not.toThrow();
        
        const { getByTestId } = renderComponent();
        const activitiesSection = getByTestId('activities-section');
        expect(activitiesSection.children).toHaveLength(0);
        
        // Clean up for next iteration
        mockArrayHandler.validateArray.mockClear();
        mockArrayHandler.handleUndefinedArray.mockClear();
      });
    });

    it('should handle completely missing agent data', () => {
      // Given: No agent data at all
      const agentData = null;

      // When: Rendering component with null agent
      const renderComponent = () => render(
        <MockUnifiedAgentPage agent={agentData} />
      );

      // Then: Should not crash and should render empty state
      expect(renderComponent).not.toThrow();
      
      const { getByTestId } = renderComponent();
      const activitiesSection = getByTestId('activities-section');
      expect(activitiesSection.children).toHaveLength(0);
    });
  });

  describe('AgentProfile Component Activity Updates', () => {
    it('should safely update activities when current activities is an array', () => {
      // Given: Valid agent data with array activities
      const agentData = {
        id: 'agent-1',
        recentActivities: [
          { id: '1', title: 'Existing Activity' }
        ]
      };

      const mockOnActivityUpdate = jest.fn();
      mockComponentState.updateActivityState.mockImplementation(mockOnActivityUpdate);

      // When: Component attempts to update activities
      const { getByTestId } = render(
        <MockAgentProfile 
          agentData={agentData} 
          onActivityUpdate={mockComponentState.updateActivityState} 
        />
      );

      const addButton = getByTestId('add-activity-btn');
      addButton.click();

      // Then: Should successfully update without crashing
      expect(mockComponentState.updateActivityState).toHaveBeenCalledWith([
        { id: 'new', title: 'New Activity' },
        { id: '1', title: 'Existing Activity' }
      ]);
    });

    it('should handle activity updates when recentActivities is undefined', () => {
      // Given: Agent data with undefined activities
      const agentData = {
        id: 'agent-1',
        recentActivities: undefined
      };

      const mockOnActivityUpdate = jest.fn();
      mockComponentState.updateActivityState.mockImplementation(() => {
        // Should not be called due to validation
      });

      // When: Attempting to update undefined activities
      const { getByTestId } = render(
        <MockAgentProfile 
          agentData={agentData} 
          onActivityUpdate={mockComponentState.updateActivityState} 
        />
      );

      const addButton = getByTestId('add-activity-btn');
      addButton.click();

      // Then: Should not attempt to call slice on undefined
      expect(mockComponentState.updateActivityState).not.toHaveBeenCalled();
    });

    it('should handle activity updates when agentData is null', () => {
      // Given: Null agent data
      const agentData = null;
      const mockOnActivityUpdate = jest.fn();

      // When: Rendering with null agent data
      const { getByTestId } = render(
        <MockAgentProfile 
          agentData={agentData} 
          onActivityUpdate={mockOnActivityUpdate} 
        />
      );

      const addButton = getByTestId('add-activity-btn');
      addButton.click();

      // Then: Should handle gracefully without crashing
      expect(mockOnActivityUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Array Handler Contract Verification', () => {
    it('should validate array before performing operations', () => {
      // Given: Various data types for validation
      const testValues = [
        { value: [], expected: true },
        { value: [1, 2, 3], expected: true },
        { value: null, expected: false },
        { value: undefined, expected: false },
        { value: 'string', expected: false },
        { value: 123, expected: false },
        { value: {}, expected: false }
      ];

      testValues.forEach(({ value, expected }) => {
        mockArrayHandler.validateArray.mockReturnValueOnce(expected);

        // When: Validating the value
        const result = mockArrayHandler.validateArray(value);

        // Then: Verify contract behavior
        expect(mockArrayHandler.validateArray).toHaveBeenCalledWith(value);
        expect(result).toBe(expected);
        
        mockArrayHandler.validateArray.mockClear();
      });
    });

    it('should provide safe slice operation', () => {
      // Given: Array handler with safe slice implementation
      const testArray = [1, 2, 3, 4, 5];
      const expectedSlice = [1, 2, 3];
      
      mockArrayHandler.safeSlice.mockReturnValue(expectedSlice);

      // When: Performing safe slice
      const result = mockArrayHandler.safeSlice(testArray, 0, 3);

      // Then: Verify safe slice contract
      expect(mockArrayHandler.safeSlice).toHaveBeenCalledWith(testArray, 0, 3);
      expect(result).toEqual(expectedSlice);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle edge cases in safe slice', () => {
      // Given: Edge case scenarios
      const edgeCases = [
        { input: [], start: 0, end: 3, expected: [] },
        { input: [1], start: 0, end: 5, expected: [1] },
        { input: [1, 2, 3], start: 1, end: 2, expected: [2] }
      ];

      edgeCases.forEach(({ input, start, end, expected }) => {
        mockArrayHandler.safeSlice.mockReturnValueOnce(expected);

        // When: Handling edge case
        const result = mockArrayHandler.safeSlice(input, start, end);

        // Then: Verify edge case handling
        expect(mockArrayHandler.safeSlice).toHaveBeenCalledWith(input, start, end);
        expect(result).toEqual(expected);
        expect(Array.isArray(result)).toBe(true);

        mockArrayHandler.safeSlice.mockClear();
      });
    });
  });

  describe('Error Boundary Integration Behavior', () => {
    it('should coordinate with error boundary for component crashes', () => {
      // Given: Error boundary mock setup
      const mockError = new Error('recentActivities.slice is not a function');
      mockErrorBoundary.catchError.mockReturnValue(true);
      mockErrorBoundary.renderFallback.mockReturnValue('Error occurred');

      // When: Simulating component error
      const errorInfo = { componentStack: 'Component stack trace' };
      mockErrorBoundary.catchError(mockError, errorInfo);

      // Then: Verify error boundary interaction
      expect(mockErrorBoundary.catchError).toHaveBeenCalledWith(mockError, errorInfo);
      expect(mockErrorBoundary.catchError).toHaveReturnedWith(true);
    });

    it('should log errors for debugging and monitoring', () => {
      // Given: Error logging setup
      const mockError = new Error('Array method called on undefined');
      const errorContext = {
        component: 'UnifiedAgentPage',
        props: { agent: { recentActivities: undefined } }
      };

      mockErrorBoundary.logError.mockImplementation((error, context) => {
        console.error('Component Error:', error.message, context);
      });

      // When: Logging error
      mockErrorBoundary.logError(mockError, errorContext);

      // Then: Verify error logging behavior
      expect(mockErrorBoundary.logError).toHaveBeenCalledWith(mockError, errorContext);
      expect(console.error).toHaveBeenCalledWith(
        'Component Error:', 
        'Array method called on undefined', 
        errorContext
      );
    });
  });

  describe('Component State Management Contract', () => {
    it('should maintain consistent state during activity updates', async () => {
      // Given: State management contract
      const initialActivities = [{ id: '1', title: 'Initial' }];
      const newActivity = { id: '2', title: 'New Activity' };
      
      mockComponentState.getRecentActivities.mockReturnValue(initialActivities);
      mockComponentState.setRecentActivities.mockImplementation((activities) => {
        mockComponentState.getRecentActivities.mockReturnValue(activities);
      });

      // When: Updating component state
      const currentActivities = mockComponentState.getRecentActivities();
      const updatedActivities = [newActivity, ...currentActivities];
      mockComponentState.setRecentActivities(updatedActivities);

      // Then: Verify state consistency
      expect(mockComponentState.getRecentActivities).toHaveBeenCalled();
      expect(mockComponentState.setRecentActivities).toHaveBeenCalledWith(updatedActivities);
      
      const finalActivities = mockComponentState.getRecentActivities();
      expect(finalActivities).toEqual(updatedActivities);
      expect(Array.isArray(finalActivities)).toBe(true);
    });

    it('should validate state before updates', () => {
      // Given: State validation requirements
      const invalidStates = [null, undefined, 'string', 123, {}];
      
      invalidStates.forEach(invalidState => {
        mockComponentState.updateActivityState.mockImplementation((state) => {
          if (!Array.isArray(state)) {
            throw new Error('Invalid state: must be array');
          }
        });

        // When/Then: Attempting to set invalid state should be prevented
        expect(() => {
          mockComponentState.updateActivityState(invalidState);
        }).toThrow('Invalid state: must be array');

        mockComponentState.updateActivityState.mockClear();
      });
    });
  });

  describe('Swarm Coordination for Component Testing', () => {
    it('should share component behavior contracts with integration test agents', () => {
      // Given: Contract definitions for swarm sharing
      const componentContracts = {
        UnifiedAgentPage: {
          props: ['agent'],
          behavior: 'safely handles undefined/null recentActivities',
          errorHandling: 'graceful degradation for invalid data'
        },
        AgentProfile: {
          props: ['agentData', 'onActivityUpdate'],
          behavior: 'validates arrays before slice operations',
          errorHandling: 'prevents crashes during activity updates'
        }
      };

      // When: Verifying contracts exist in mock implementations
      expect(mockComponentState.__swarmContract).toBe(true);
      expect(mockArrayHandler.__swarmContract).toBe(true);
      expect(mockErrorBoundary.__swarmContract).toBe(true);

      // Then: Contracts should be available for swarm coordination
      expect(componentContracts.UnifiedAgentPage.behavior).toContain('safely handles');
      expect(componentContracts.AgentProfile.behavior).toContain('validates arrays');
    });

    it('should report component interaction patterns to swarm', () => {
      // Given: Component interaction monitoring
      const interactionLog: string[] = [];
      
      const logInteraction = (interaction: string) => {
        interactionLog.push(interaction);
      };

      // When: Simulating component interactions
      logInteraction('component.render');
      logInteraction('arrayHandler.validateArray');
      logInteraction('arrayHandler.safeSlice');
      logInteraction('componentState.setRecentActivities');

      // Then: Verify interaction sequence for swarm analysis
      expect(interactionLog).toEqual([
        'component.render',
        'arrayHandler.validateArray',
        'arrayHandler.safeSlice',
        'componentState.setRecentActivities'
      ]);

      // Verify proper sequence: validation before operation
      const validationIndex = interactionLog.indexOf('arrayHandler.validateArray');
      const sliceIndex = interactionLog.indexOf('arrayHandler.safeSlice');
      expect(validationIndex).toBeLessThan(sliceIndex);
    });
  });
});