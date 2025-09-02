/**
 * Permission Dialog Stub - London School TDD
 * Stub system for permission dialog interaction testing
 */

const { jest } = require('@jest/globals');

class PermissionDialogStub {
  constructor() {
    // Dialog lifecycle stubs
    this.show = jest.fn();
    this.hide = jest.fn();
    this.update = jest.fn();
    this.destroy = jest.fn();
    
    // User interaction stubs
    this.onAllow = jest.fn();
    this.onDeny = jest.fn();
    this.onCancel = jest.fn();
    this.onTimeout = jest.fn();
    
    // Permission checking stubs
    this.checkPermission = jest.fn();
    this.requestPermission = jest.fn();
    this.revokePermission = jest.fn();
    
    // Dialog state
    this.dialogState = {
      isVisible: false,
      permissionType: null,
      requestDetails: null,
      userResponse: null,
      timeoutHandle: null,
      showTime: null,
      responseTime: null
    };

    // Configurable responses for testing
    this.responseConfig = {
      defaultResponse: 'allow', // 'allow', 'deny', 'cancel', 'timeout'
      responseDelay: 100, // ms
      autoRespond: true,
      permissionStates: new Map() // permission -> granted/denied/prompt
    };

    this.setupStubBehavior();
  }

  setupStubBehavior() {
    // Show dialog stub behavior
    this.show.mockImplementation(async (permissionType, details = {}) => {
      this.dialogState.isVisible = true;
      this.dialogState.permissionType = permissionType;
      this.dialogState.requestDetails = details;
      this.dialogState.showTime = Date.now();
      this.dialogState.userResponse = null;

      // Auto-respond if configured
      if (this.responseConfig.autoRespond) {
        setTimeout(() => {
          this.simulateUserResponse(this.responseConfig.defaultResponse);
        }, this.responseConfig.responseDelay);
      }

      return {
        shown: true,
        dialogId: `dialog-${Date.now()}`,
        permissionType,
        details
      };
    });

    // Hide dialog stub behavior
    this.hide.mockImplementation(() => {
      const wasVisible = this.dialogState.isVisible;
      this.dialogState.isVisible = false;
      
      if (this.dialogState.timeoutHandle) {
        clearTimeout(this.dialogState.timeoutHandle);
        this.dialogState.timeoutHandle = null;
      }

      return {
        hidden: true,
        wasVisible,
        duration: this.dialogState.showTime ? 
          Date.now() - this.dialogState.showTime : 0
      };
    });

    // Update dialog stub behavior
    this.update.mockImplementation((updates) => {
      if (!this.dialogState.isVisible) {
        return { error: 'Dialog not visible' };
      }

      if (updates.details) {
        this.dialogState.requestDetails = {
          ...this.dialogState.requestDetails,
          ...updates.details
        };
      }

      return {
        updated: true,
        currentState: { ...this.dialogState }
      };
    });

    // Permission checking stub behavior
    this.checkPermission.mockImplementation((permissionType) => {
      const state = this.responseConfig.permissionStates.get(permissionType) || 'prompt';
      
      return {
        permission: permissionType,
        state,
        granted: state === 'granted'
      };
    });

    // Permission requesting stub behavior  
    this.requestPermission.mockImplementation(async (permissionType, options = {}) => {
      const currentState = this.responseConfig.permissionStates.get(permissionType) || 'prompt';
      
      // If already granted/denied, return immediately
      if (currentState !== 'prompt') {
        return {
          permission: permissionType,
          state: currentState,
          granted: currentState === 'granted',
          fromCache: true
        };
      }

      // Show dialog and wait for response
      await this.show(permissionType, options.details || {});
      
      return new Promise((resolve) => {
        const checkResponse = () => {
          if (this.dialogState.userResponse) {
            const granted = this.dialogState.userResponse === 'allow';
            const state = granted ? 'granted' : 'denied';
            
            this.responseConfig.permissionStates.set(permissionType, state);
            
            resolve({
              permission: permissionType,
              state,
              granted,
              userResponse: this.dialogState.userResponse,
              responseTime: this.dialogState.responseTime - this.dialogState.showTime
            });
          } else {
            setTimeout(checkResponse, 10);
          }
        };
        
        checkResponse();
      });
    });

    // User interaction stub behaviors
    this.onAllow.mockImplementation((callback) => {
      this.dialogState.userResponse = 'allow';
      this.dialogState.responseTime = Date.now();
      this.hide();
      
      if (callback) callback('allow');
      
      return { allowed: true };
    });

    this.onDeny.mockImplementation((callback) => {
      this.dialogState.userResponse = 'deny';
      this.dialogState.responseTime = Date.now();
      this.hide();
      
      if (callback) callback('deny');
      
      return { denied: true };
    });

    this.onCancel.mockImplementation((callback) => {
      this.dialogState.userResponse = 'cancel';
      this.dialogState.responseTime = Date.now();
      this.hide();
      
      if (callback) callback('cancel');
      
      return { cancelled: true };
    });

    this.onTimeout.mockImplementation((callback) => {
      this.dialogState.userResponse = 'timeout';
      this.dialogState.responseTime = Date.now();
      this.hide();
      
      if (callback) callback('timeout');
      
      return { timedOut: true };
    });
  }

  // Test utility methods for controlling stub behavior
  configureResponse(response, delay = 100) {
    this.responseConfig.defaultResponse = response;
    this.responseConfig.responseDelay = delay;
    return this;
  }

  configureAutoResponse(enabled = true) {
    this.responseConfig.autoRespond = enabled;
    return this;
  }

  setPermissionState(permissionType, state) {
    this.responseConfig.permissionStates.set(permissionType, state);
    return this;
  }

  simulateUserResponse(response) {
    switch (response) {
      case 'allow':
        this.onAllow();
        break;
      case 'deny':
        this.onDeny();
        break;
      case 'cancel':
        this.onCancel();
        break;
      case 'timeout':
        this.onTimeout();
        break;
      default:
        throw new Error(`Unknown response: ${response}`);
    }
  }

  simulateDialogTimeout(timeoutMs = 5000) {
    if (this.dialogState.isVisible) {
      this.dialogState.timeoutHandle = setTimeout(() => {
        this.simulateUserResponse('timeout');
      }, timeoutMs);
    }
  }

  // Behavior verification methods
  getDialogInteractionFlow() {
    const showCalls = this.show.mock.calls;
    const hideCalls = this.hide.mock.calls;
    const allowCalls = this.onAllow.mock.calls;
    const denyCalls = this.onDeny.mock.calls;
    const cancelCalls = this.onCancel.mock.calls;

    return {
      interactions: {
        shows: showCalls.length,
        hides: hideCalls.length,
        allows: allowCalls.length,
        denies: denyCalls.length,
        cancels: cancelCalls.length
      },
      flow: showCalls.map((showCall, index) => ({
        show: {
          permissionType: showCall[0],
          details: showCall[1],
          timestamp: this.getCallTimestamp('show', index)
        },
        response: this.getResponseForShow(index),
        hide: hideCalls[index] ? {
          timestamp: this.getCallTimestamp('hide', index)
        } : null
      }))
    };
  }

  getPermissionRequestFlow() {
    const checkCalls = this.checkPermission.mock.calls;
    const requestCalls = this.requestPermission.mock.calls;

    return {
      checks: checkCalls.map(call => ({
        permissionType: call[0],
        result: call.returnValue || this.checkPermission(call[0])
      })),
      requests: requestCalls.map(call => ({
        permissionType: call[0],
        options: call[1] || {},
        result: call.returnValue
      })),
      pattern: this.analyzeRequestPattern()
    };
  }

  // Verification helpers
  verifyDialogShownFor(permissionType, expectedDetails = {}) {
    const showCalls = this.show.mock.calls;
    
    return showCalls.some(call => {
      const [type, details] = call;
      return type === permissionType && 
             this.detailsMatch(details, expectedDetails);
    });
  }

  verifyResponseGiven(expectedResponse) {
    return this.dialogState.userResponse === expectedResponse;
  }

  verifyPermissionGranted(permissionType) {
    const state = this.responseConfig.permissionStates.get(permissionType);
    return state === 'granted';
  }

  verifyPermissionDenied(permissionType) {
    const state = this.responseConfig.permissionStates.get(permissionType);
    return state === 'denied';
  }

  verifyDialogTimeout() {
    return this.dialogState.userResponse === 'timeout';
  }

  verifyResponseTime(maxTime = 1000) {
    if (!this.dialogState.responseTime || !this.dialogState.showTime) {
      return false;
    }
    
    const responseTime = this.dialogState.responseTime - this.dialogState.showTime;
    return responseTime <= maxTime;
  }

  // State inspection methods
  getCurrentDialogState() {
    return { ...this.dialogState };
  }

  getPermissionStates() {
    return new Map(this.responseConfig.permissionStates);
  }

  isDialogVisible() {
    return this.dialogState.isVisible;
  }

  getLastPermissionRequest() {
    const calls = this.requestPermission.mock.calls;
    return calls[calls.length - 1];
  }

  // Helper methods
  private detailsMatch(actual, expected) {
    return Object.entries(expected).every(([key, value]) => 
      actual[key] === value
    );
  }

  private getCallTimestamp(methodName, callIndex) {
    return this[methodName].mock.calls[callIndex]?.timestamp || Date.now();
  }

  private getResponseForShow(showIndex) {
    const responses = [
      ...this.onAllow.mock.calls.map(call => ({ type: 'allow', call })),
      ...this.onDeny.mock.calls.map(call => ({ type: 'deny', call })),
      ...this.onCancel.mock.calls.map(call => ({ type: 'cancel', call })),
      ...this.onTimeout.mock.calls.map(call => ({ type: 'timeout', call }))
    ].sort((a, b) => (a.call.timestamp || 0) - (b.call.timestamp || 0));

    return responses[showIndex] || null;
  }

  private analyzeRequestPattern() {
    const requests = this.requestPermission.mock.calls;
    const permissionTypes = requests.map(call => call[0]);
    const uniqueTypes = [...new Set(permissionTypes)];

    return {
      totalRequests: requests.length,
      uniquePermissions: uniqueTypes.length,
      duplicateRequests: requests.length - uniqueTypes.length,
      mostRequested: this.getMostRequestedPermission(permissionTypes),
      requestOrder: permissionTypes
    };
  }

  private getMostRequestedPermission(types) {
    const counts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).reduce((max, [type, count]) => 
      count > (max.count || 0) ? { type, count } : max
    , {});
  }

  // Reset stub state for clean testing
  reset() {
    jest.clearAllMocks();
    
    this.dialogState = {
      isVisible: false,
      permissionType: null,
      requestDetails: null,
      userResponse: null,
      timeoutHandle: null,
      showTime: null,
      responseTime: null
    };

    this.responseConfig = {
      defaultResponse: 'allow',
      responseDelay: 100,
      autoRespond: true,
      permissionStates: new Map()
    };

    this.setupStubBehavior();
  }
}

module.exports = {
  PermissionDialogStub
};