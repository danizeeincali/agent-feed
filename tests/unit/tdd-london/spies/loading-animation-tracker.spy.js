/**
 * Loading Animation Tracker Spy - London School TDD
 * Spy patterns for tracking loading animation state and behavior
 */

const { jest } = require('@jest/globals');

class LoadingAnimationTrackerSpy {
  constructor() {
    // Animation lifecycle spies
    this.startAnimation = jest.fn();
    this.updateAnimation = jest.fn();
    this.pauseAnimation = jest.fn();
    this.resumeAnimation = jest.fn();
    this.stopAnimation = jest.fn();
    
    // State tracking spies
    this.setProgress = jest.fn();
    this.setMessage = jest.fn();
    this.setStage = jest.fn();
    this.addProgressStep = jest.fn();
    
    // Interaction spies
    this.onUserInteraction = jest.fn();
    this.onBackgroundActivity = jest.fn();
    this.onError = jest.fn();
    
    // Internal state for behavior verification
    this.animationState = {
      isActive: false,
      progress: 0,
      currentMessage: '',
      currentStage: 'idle',
      steps: [],
      startTime: null,
      lastUpdate: null,
      errorCount: 0,
      interactionCount: 0
    };
    
    this.setupSpyBehavior();
  }

  setupSpyBehavior() {
    // Start animation spy behavior
    this.startAnimation.mockImplementation((config = {}) => {
      this.animationState.isActive = true;
      this.animationState.startTime = Date.now();
      this.animationState.currentStage = config.stage || 'initializing';
      this.animationState.currentMessage = config.message || 'Starting...';
      this.animationState.progress = 0;
      
      return {
        started: true,
        animationId: `anim-${Date.now()}`,
        config
      };
    });

    // Update animation spy behavior
    this.updateAnimation.mockImplementation((data) => {
      if (!this.animationState.isActive) {
        return { error: 'Animation not active' };
      }
      
      this.animationState.lastUpdate = Date.now();
      
      if (data.progress !== undefined) {
        this.animationState.progress = Math.max(0, Math.min(100, data.progress));
      }
      
      if (data.message) {
        this.animationState.currentMessage = data.message;
      }
      
      if (data.stage) {
        this.animationState.currentStage = data.stage;
      }
      
      return {
        updated: true,
        currentState: { ...this.animationState }
      };
    });

    // Progress setting spy behavior
    this.setProgress.mockImplementation((progress) => {
      const normalizedProgress = Math.max(0, Math.min(100, progress));
      this.animationState.progress = normalizedProgress;
      
      return {
        set: true,
        progress: normalizedProgress,
        isComplete: normalizedProgress >= 100
      };
    });

    // Message setting spy behavior
    this.setMessage.mockImplementation((message) => {
      const previousMessage = this.animationState.currentMessage;
      this.animationState.currentMessage = message;
      
      return {
        set: true,
        message,
        previousMessage,
        messageHistory: this.getMessageHistory()
      };
    });

    // Stage setting spy behavior
    this.setStage.mockImplementation((stage) => {
      const previousStage = this.animationState.currentStage;
      this.animationState.currentStage = stage;
      
      return {
        set: true,
        stage,
        previousStage,
        stageTransition: `${previousStage} → ${stage}`
      };
    });

    // Progress step adding spy behavior
    this.addProgressStep.mockImplementation((step) => {
      const stepWithTimestamp = {
        ...step,
        timestamp: Date.now(),
        order: this.animationState.steps.length + 1
      };
      
      this.animationState.steps.push(stepWithTimestamp);
      
      return {
        added: true,
        step: stepWithTimestamp,
        totalSteps: this.animationState.steps.length
      };
    });

    // Stop animation spy behavior
    this.stopAnimation.mockImplementation((reason = 'completed') => {
      const duration = this.animationState.startTime ? 
        Date.now() - this.animationState.startTime : 0;
      
      const finalState = { ...this.animationState };
      
      this.animationState.isActive = false;
      this.animationState.currentStage = 'stopped';
      
      return {
        stopped: true,
        reason,
        duration,
        finalProgress: finalState.progress,
        totalSteps: finalState.steps.length
      };
    });

    // User interaction spy behavior
    this.onUserInteraction.mockImplementation((interactionType, data = {}) => {
      this.animationState.interactionCount++;
      
      return {
        handled: true,
        interactionType,
        data,
        totalInteractions: this.animationState.interactionCount,
        animationActive: this.animationState.isActive
      };
    });

    // Error handling spy behavior
    this.onError.mockImplementation((error, context = {}) => {
      this.animationState.errorCount++;
      
      return {
        handled: true,
        error: error.message || error,
        context,
        totalErrors: this.animationState.errorCount,
        shouldStopAnimation: this.animationState.errorCount > 3
      };
    });
  }

  // Behavior verification methods
  getAnimationLifecycleFlow() {
    const startCalls = this.startAnimation.mock.calls;
    const updateCalls = this.updateAnimation.mock.calls;
    const stopCalls = this.stopAnimation.mock.calls;
    
    return {
      lifecycle: {
        starts: startCalls.length,
        updates: updateCalls.length,
        stops: stopCalls.length,
        isComplete: stopCalls.length >= startCalls.length
      },
      flow: startCalls.map((startCall, index) => ({
        start: {
          call: index + 1,
          config: startCall[0],
          timestamp: this.getCallTimestamp('startAnimation', index)
        },
        updates: updateCalls.filter((_, updateIndex) => 
          this.isUpdateAfterStart(index, updateIndex)
        ).length,
        stop: stopCalls[index] ? {
          reason: stopCalls[index][0],
          timestamp: this.getCallTimestamp('stopAnimation', index)
        } : null
      }))
    };
  }

  getProgressTrackingPattern() {
    const progressCalls = this.setProgress.mock.calls;
    const messageCalls = this.setMessage.mock.calls;
    const stageCalls = this.setStage.mock.calls;
    
    return {
      progressUpdates: progressCalls.map(call => call[0]),
      messageUpdates: messageCalls.map(call => call[0]),
      stageTransitions: stageCalls.map(call => call[0]),
      coordinatedUpdates: this.findCoordinatedUpdates(),
      progressionPattern: this.analyzeProgressionPattern()
    };
  }

  getInteractionHandlingBehavior() {
    const interactionCalls = this.onUserInteraction.mock.calls;
    const errorCalls = this.onError.mock.calls;
    
    return {
      interactions: {
        total: interactionCalls.length,
        types: interactionCalls.reduce((acc, call) => {
          const type = call[0];
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {}),
        duringAnimation: interactionCalls.filter(call => 
          this.wasAnimationActiveAt(call.timestamp)
        ).length
      },
      errors: {
        total: errorCalls.length,
        handled: errorCalls.filter(call => call.returnValue?.handled).length,
        causingStop: errorCalls.filter(call => 
          call.returnValue?.shouldStopAnimation
        ).length
      }
    };
  }

  // Verification helpers
  verifyAnimationStartedWith(expectedConfig) {
    const startCalls = this.startAnimation.mock.calls;
    return startCalls.some(call => 
      this.configMatches(call[0], expectedConfig)
    );
  }

  verifyProgressIncreased() {
    const progressCalls = this.setProgress.mock.calls;
    if (progressCalls.length < 2) return false;
    
    for (let i = 1; i < progressCalls.length; i++) {
      if (progressCalls[i][0] <= progressCalls[i-1][0]) {
        return false;
      }
    }
    return true;
  }

  verifyStageProgression(expectedStages) {
    const stageCalls = this.setStage.mock.calls.map(call => call[0]);
    
    if (stageCalls.length !== expectedStages.length) return false;
    
    return expectedStages.every((stage, index) => 
      stageCalls[index] === stage
    );
  }

  verifyErrorHandling(errorType, shouldContinue = true) {
    const errorCalls = this.onError.mock.calls;
    const relevantError = errorCalls.find(call => 
      call[0].type === errorType || call[0].message?.includes(errorType)
    );
    
    if (!relevantError) return false;
    
    const errorResult = relevantError.returnValue || {};
    return errorResult.handled && 
           (shouldContinue ? !errorResult.shouldStopAnimation : errorResult.shouldStopAnimation);
  }

  // State inspection methods
  getCurrentState() {
    return { ...this.animationState };
  }

  getMessageHistory() {
    return this.setMessage.mock.calls.map(call => call[0]);
  }

  getStageHistory() {
    return this.setStage.mock.calls.map(call => call[0]);
  }

  getProgressHistory() {
    return this.setProgress.mock.calls.map(call => call[0]);
  }

  // Helper methods
  private configMatches(actual, expected) {
    return Object.entries(expected).every(([key, value]) => 
      actual[key] === value
    );
  }

  private getCallTimestamp(methodName, callIndex) {
    return this[methodName].mock.calls[callIndex]?.timestamp || Date.now();
  }

  private isUpdateAfterStart(startIndex, updateIndex) {
    const startTime = this.getCallTimestamp('startAnimation', startIndex);
    const updateTime = this.getCallTimestamp('updateAnimation', updateIndex);
    return updateTime > startTime;
  }

  private findCoordinatedUpdates() {
    // Find updates that happened within 10ms of each other
    const allCalls = [
      ...this.setProgress.mock.calls.map(call => ({ type: 'progress', value: call[0] })),
      ...this.setMessage.mock.calls.map(call => ({ type: 'message', value: call[0] })),
      ...this.setStage.mock.calls.map(call => ({ type: 'stage', value: call[0] }))
    ].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    const coordinated = [];
    for (let i = 1; i < allCalls.length; i++) {
      if ((allCalls[i].timestamp - allCalls[i-1].timestamp) < 10) {
        coordinated.push([allCalls[i-1], allCalls[i]]);
      }
    }
    
    return coordinated;
  }

  private analyzeProgressionPattern() {
    const progressValues = this.getProgressHistory();
    
    return {
      isMonotonic: progressValues.every((val, i) => 
        i === 0 || val >= progressValues[i-1]
      ),
      hasJumps: progressValues.some((val, i) => 
        i > 0 && (val - progressValues[i-1]) > 20
      ),
      completedFully: progressValues.some(val => val >= 100)
    };
  }

  private wasAnimationActiveAt(timestamp) {
    // This would need actual timestamp tracking in a real implementation
    return this.animationState.isActive;
  }

  // Reset spy state for clean testing
  reset() {
    jest.clearAllMocks();
    this.animationState = {
      isActive: false,
      progress: 0,
      currentMessage: '',
      currentStage: 'idle',
      steps: [],
      startTime: null,
      lastUpdate: null,
      errorCount: 0,
      interactionCount: 0
    };
    this.setupSpyBehavior();
  }
}

module.exports = {
  LoadingAnimationTrackerSpy
};