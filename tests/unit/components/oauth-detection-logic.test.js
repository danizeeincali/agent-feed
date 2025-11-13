/**
 * Unit Test for OAuth Detection Logic
 * Tests the detection logic without React rendering
 */

describe('OAuth Detection Logic', () => {
  // Simulate the detection logic from OAuthConsent.tsx (lines 39-47)
  function processDetectionResponse(data) {
    const state = {
      apiKey: '',
      cliDetected: false,
      detectedEmail: ''
    };

    if (data.detected) {
      // Pre-populate API key if available
      if (data.encryptedKey) {
        state.apiKey = data.encryptedKey;
      }
      // Always set detection state
      state.detectedEmail = data.email || 'Unknown';
      state.cliDetected = true;
    }

    return state;
  }

  // Determine which UI message to show
  function getUIMessage(state) {
    if (state.cliDetected) {
      if (state.apiKey) {
        return {
          banner: 'green',
          message: `We detected your Claude CLI login (${state.detectedEmail}). Click Authorize to continue, or edit the key below.`
        };
      } else {
        return {
          banner: 'green',
          message: `You're logged in to Claude CLI via ${state.detectedEmail} subscription. Please enter your API key from console.anthropic.com to continue.`
        };
      }
    } else {
      return {
        banner: 'yellow',
        message: "Anthropic doesn't currently offer public OAuth. Please enter your API key directly. It will be encrypted and stored securely."
      };
    }
  }

  describe('Scenario 1: API Key Detected', () => {
    const mockResponse = {
      detected: true,
      method: 'api-key',
      email: 'test@example.com',
      encryptedKey: 'sk-ant-api03-encrypted-test-key'
    };

    it('should pre-populate API key when encryptedKey is present', () => {
      const state = processDetectionResponse(mockResponse);

      expect(state.apiKey).toBe('sk-ant-api03-encrypted-test-key');
      expect(state.cliDetected).toBe(true);
      expect(state.detectedEmail).toBe('test@example.com');
    });

    it('should show green banner with API key detected message', () => {
      const state = processDetectionResponse(mockResponse);
      const ui = getUIMessage(state);

      expect(ui.banner).toBe('green');
      expect(ui.message).toContain('We detected your Claude CLI login');
      expect(ui.message).toContain('test@example.com');
      expect(ui.message).toContain('Click Authorize to continue');
    });
  });

  describe('Scenario 2: OAuth Detected (NO encryptedKey) - THE BUG FIX', () => {
    const mockResponse = {
      detected: true,
      method: 'oauth',
      email: 'max',
      message: 'Claude CLI OAuth login detected'
      // NO encryptedKey field
    };

    it('should NOT pre-populate API key when only OAuth is detected', () => {
      const state = processDetectionResponse(mockResponse);

      expect(state.apiKey).toBe('');
      expect(state.cliDetected).toBe(true);
      expect(state.detectedEmail).toBe('max');
    });

    it('should show green banner with OAuth-specific message', () => {
      const state = processDetectionResponse(mockResponse);
      const ui = getUIMessage(state);

      expect(ui.banner).toBe('green');
      expect(ui.message).toContain("You're logged in to Claude CLI via max subscription");
      expect(ui.message).toContain('Please enter your API key from console.anthropic.com');
    });

    it('should set cliDetected to true even without encryptedKey', () => {
      const state = processDetectionResponse(mockResponse);

      expect(state.cliDetected).toBe(true);
    });
  });

  describe('Scenario 3: No Detection', () => {
    const mockResponse = {
      detected: false,
      message: 'No Claude CLI login detected'
    };

    it('should not set any state when nothing is detected', () => {
      const state = processDetectionResponse(mockResponse);

      expect(state.apiKey).toBe('');
      expect(state.cliDetected).toBe(false);
      expect(state.detectedEmail).toBe('');
    });

    it('should show yellow warning banner', () => {
      const state = processDetectionResponse(mockResponse);
      const ui = getUIMessage(state);

      expect(ui.banner).toBe('yellow');
      expect(ui.message).toContain("Anthropic doesn't currently offer public OAuth");
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing email with "Unknown"', () => {
      const mockResponse = {
        detected: true,
        method: 'oauth'
        // No email
      };

      const state = processDetectionResponse(mockResponse);
      expect(state.detectedEmail).toBe('Unknown');
    });

    it('should handle empty encryptedKey', () => {
      const mockResponse = {
        detected: true,
        method: 'api-key',
        email: 'test@example.com',
        encryptedKey: '' // Empty string
      };

      const state = processDetectionResponse(mockResponse);

      // Empty string should not pre-populate (because it's falsy)
      expect(state.apiKey).toBe('');
      expect(state.cliDetected).toBe(true);
    });

    it('should handle undefined encryptedKey', () => {
      const mockResponse = {
        detected: true,
        method: 'oauth',
        email: 'user@example.com'
        // encryptedKey is undefined
      };

      const state = processDetectionResponse(mockResponse);

      expect(state.apiKey).toBe('');
      expect(state.cliDetected).toBe(true);
      expect(state.detectedEmail).toBe('user@example.com');
    });
  });

  describe('THE CRITICAL BUG THAT WAS FIXED', () => {
    it('OLD LOGIC: would not show green banner for OAuth-only users', () => {
      // Simulating the OLD broken logic
      function oldBuggyLogic(data) {
        const state = {
          apiKey: '',
          cliDetected: false,
          detectedEmail: ''
        };

        // OLD CODE: if (data.detected && data.encryptedKey) {
        if (data.detected && data.encryptedKey) {
          setApiKey(data.encryptedKey);
          setDetectedEmail(data.email || 'Unknown');
          setCliDetected(true);
        }

        function setApiKey(val) { state.apiKey = val; }
        function setDetectedEmail(val) { state.detectedEmail = val; }
        function setCliDetected(val) { state.cliDetected = val; }

        return state;
      }

      const oauthResponse = {
        detected: true,
        method: 'oauth',
        email: 'max'
        // NO encryptedKey
      };

      const oldState = oldBuggyLogic(oauthResponse);

      // Bug: cliDetected would be false for OAuth-only users!
      expect(oldState.cliDetected).toBe(false);
      expect(oldState.detectedEmail).toBe('');
    });

    it('NEW LOGIC: correctly shows green banner for OAuth-only users', () => {
      const oauthResponse = {
        detected: true,
        method: 'oauth',
        email: 'max'
        // NO encryptedKey
      };

      const newState = processDetectionResponse(oauthResponse);

      // Fix: cliDetected is now true for OAuth-only users!
      expect(newState.cliDetected).toBe(true);
      expect(newState.detectedEmail).toBe('max');
      expect(newState.apiKey).toBe('');
    });
  });
});
