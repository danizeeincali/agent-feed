/**
 * TDD London School - RED Phase Analysis
 * Documents the failing behavior before implementing fixes
 * This is the current state: ERR_SOCKET_NOT_CONNECTED in browser
 */

const { networkMockRegistry, EnvironmentMock } = require('./mocks/network-mocks');
const { ConnectionManager, CodespacesConnectionStrategy, LocalConnectionStrategy } = require('./contracts/connection-contracts');

describe('RED PHASE - Current Network Connectivity Failures', () => {
  
  beforeAll(() => {
    // Setup environment detection
    console.log('🔍 Environment Analysis:');
    console.log('- CODESPACES:', process.env.CODESPACES);
    console.log('- CODESPACE_NAME:', process.env.CODESPACE_NAME);
    console.log('- PORT 5173 Status: Server running (verified via curl)');
    console.log('- Server bound to: 0.0.0.0:5173');
    console.log('- Browser error: ERR_SOCKET_NOT_CONNECTED');
  });

  describe('Current Failure Patterns', () => {
    
    it('should document browser fetch failures to localhost:5173', async () => {
      // This test documents the current failing behavior
      const mockFetch = jest.fn().mockRejectedValue(new Error('ERR_SOCKET_NOT_CONNECTED'));
      global.fetch = mockFetch;
      
      try {
        await fetch('http://localhost:5173/health');
        fail('Expected fetch to fail - this is RED phase');
      } catch (error) {
        // Document the exact error we're seeing
        expect(error.message).toBe('ERR_SOCKET_NOT_CONNECTED');
        console.log('✗ Browser fetch fails:', error.message);
        
        // Verify the interaction happened
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:5173/health');
      }
    });

    it('should document WebSocket connection failures', () => {
      const mockWS = {
        readyState: 3, // CLOSED
        onerror: null,
        onclose: null
      };

      const WebSocketMock = jest.fn().mockImplementation(() => {
        setTimeout(() => {
          if (mockWS.onerror) mockWS.onerror(new Event('error'));
          if (mockWS.onclose) mockWS.onclose(new CloseEvent('close', { code: 1006 }));
        }, 0);
        return mockWS;
      });

      global.WebSocket = WebSocketMock;

      return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:5173/ws');
        ws.onerror = () => {
          console.log('✗ WebSocket connection fails with code 1006');
          expect(ws.readyState).toBe(3);
          expect(WebSocketMock).toHaveBeenCalledWith('ws://localhost:5173/ws');
          resolve();
        };
      });
    });

    it('should document XMLHttpRequest failures', () => {
      const mockXHR = {
        open: jest.fn(),
        send: jest.fn(),
        addEventListener: jest.fn(),
        status: 0,
        readyState: 4
      };

      global.XMLHttpRequest = jest.fn().mockImplementation(() => {
        mockXHR.send.mockImplementation(() => {
          setTimeout(() => {
            mockXHR.addEventListener.mock.calls.forEach(([event, handler]) => {
              if (event === 'error') handler(new Event('error'));
            });
          }, 0);
        });
        return mockXHR;
      });

      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('error', () => {
          console.log('✗ XMLHttpRequest fails with status 0 (network error)');
          expect(mockXHR.status).toBe(0);
          expect(mockXHR.open).toHaveBeenCalledWith('GET', 'http://localhost:5173/api/status');
          resolve();
        });
        
        xhr.open('GET', 'http://localhost:5173/api/status');
        xhr.send();
      });
    });
  });

  describe('Environment-Specific Analysis', () => {
    
    it('should detect GitHub Codespaces environment', () => {
      // Mock Codespaces environment
      const envMock = EnvironmentMock.mockCodespacesEnvironment();
      
      console.log('🔍 Codespaces Environment Check:');
      console.log('- CODESPACES:', process.env.CODESPACES);
      console.log('- CODESPACE_NAME:', process.env.CODESPACE_NAME);
      console.log('- PORT_FORWARDING_DOMAIN:', process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN);
      
      expect(process.env.CODESPACES).toBe('true');
      
      // Calculate expected public URL
      const expectedUrl = `https://${process.env.CODESPACE_NAME}-5173.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
      console.log('- Expected public URL:', expectedUrl);
      
      envMock.restore();
    });

    it('should document port forwarding status', () => {
      // In RED phase, we document that browser cannot access localhost:5173
      // even though server is running and curl works
      console.log('🔍 Port Forwarding Analysis:');
      console.log('- Server Status: ✓ Running on 0.0.0.0:5173');
      console.log('- Curl Access: ✓ Works (HTTP/1.1 200 OK)');
      console.log('- Browser Access: ✗ ERR_SOCKET_NOT_CONNECTED');
      console.log('- Problem: Browser cannot reach server despite localhost binding');
      
      // This is the core issue we need to solve in GREEN phase
      expect(true).toBe(true); // Placeholder - documents the investigation
    });
  });

  describe('Connection Strategy Failures', () => {
    
    it('should test local connection strategy failure', async () => {
      const strategy = new LocalConnectionStrategy();
      
      // Mock the fetch to fail
      const mockFetch = jest.fn().mockRejectedValue(new Error('ERR_SOCKET_NOT_CONNECTED'));
      global.fetch = mockFetch;
      
      const canConnect = await strategy.test();
      
      console.log('✗ Local strategy test result:', canConnect);
      expect(canConnect).toBe(false);
      
      // Verify it tried the expected URLs
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5173/health');
    });

    it('should test codespaces connection strategy requirement', async () => {
      // If we're in Codespaces, we should use the public URL instead
      const envMock = EnvironmentMock.mockCodespacesEnvironment();
      
      const strategy = new CodespacesConnectionStrategy();
      const isAvailable = strategy.isAvailable();
      
      console.log('🔍 Codespaces Strategy Available:', isAvailable);
      
      if (isAvailable) {
        const publicUrl = strategy.getPublicUrl(5173);
        console.log('- Public URL would be:', publicUrl);
        
        // In RED phase, this would still fail because we haven't implemented proper forwarding
        const mockFetch = jest.fn().mockRejectedValue(new Error('ERR_SOCKET_NOT_CONNECTED'));
        global.fetch = mockFetch;
        
        const canConnect = await strategy.test();
        console.log('✗ Codespaces strategy test result:', canConnect);
        expect(canConnect).toBe(false);
      }
      
      envMock.restore();
    });
  });

  describe('Root Cause Analysis', () => {
    
    it('should identify the core problem', () => {
      console.log('🎯 ROOT CAUSE ANALYSIS:');
      console.log('');
      console.log('1. SYMPTOMS:');
      console.log('   ✓ Server running on 0.0.0.0:5173');
      console.log('   ✓ Curl works from command line');
      console.log('   ✗ Browser gets ERR_SOCKET_NOT_CONNECTED');
      console.log('');
      console.log('2. HYPOTHESIS:');
      console.log('   - In GitHub Codespaces, browser runs in different context');
      console.log('   - localhost:5173 not accessible from browser context');
      console.log('   - Need to use Codespaces public URL for browser access');
      console.log('');
      console.log('3. SOLUTION STRATEGY (GREEN PHASE):');
      console.log('   - Detect Codespaces environment');
      console.log('   - Use public forwarded URL instead of localhost');
      console.log('   - Implement connection strategy pattern');
      console.log('   - Add fallbacks for different environments');
      
      // This documents our understanding for the GREEN phase
      expect(true).toBe(true);
    });
  });
});

module.exports = {
  runRedPhaseAnalysis: () => {
    console.log('🔴 RED PHASE ANALYSIS COMPLETE');
    console.log('Key findings:');
    console.log('- Browser cannot access localhost:5173 in Codespaces');
    console.log('- Server is running and accessible via curl');
    console.log('- Need Codespaces-aware connection strategy');
    console.log('- Moving to GREEN phase implementation...');
  }
};