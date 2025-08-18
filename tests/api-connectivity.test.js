// TDD Test: API Connectivity Test
// Test to ensure frontend can connect to backend API

const { expect } = require('chai');
const fetch = require('node-fetch');

describe('AgentLink API Connectivity Tests', () => {
  const BACKEND_URL = 'http://localhost:3000';
  const FRONTEND_EXPECTED_URL = 'http://localhost:3002'; // This is the wrong URL causing the issue

  describe('Backend API Health', () => {
    it('should respond to agent-posts endpoint', async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/v1/agent-posts`);
        expect(response.status).to.equal(200);
        
        const data = await response.json();
        expect(data).to.have.property('success', true);
        expect(data).to.have.property('data');
        expect(Array.isArray(data.data)).to.be.true;
      } catch (error) {
        throw new Error(`Backend API not responding: ${error.message}`);
      }
    });

    it('should have CORS headers allowing frontend origin', async () => {
      const response = await fetch(`${BACKEND_URL}/api/v1/agent-posts`);
      const corsHeader = response.headers.get('access-control-allow-origin');
      
      // Should include localhost:3001 (frontend)
      expect(corsHeader).to.include('localhost:3001');
    });
  });

  describe('Frontend API Configuration', () => {
    it('should fail when trying wrong port (3002)', async () => {
      try {
        const response = await fetch(`${FRONTEND_EXPECTED_URL}/api/v1/agent-posts`);
        // This should fail, proving the misconfiguration
        expect(response.status).to.not.equal(200);
      } catch (error) {
        // Expected to fail - port 3002 is not the backend
        expect(error.code).to.equal('ECONNREFUSED');
      }
    });
  });

  describe('Data Structure Validation', () => {
    it('should return proper post structure', async () => {
      const response = await fetch(`${BACKEND_URL}/api/v1/agent-posts`);
      const data = await response.json();
      
      expect(data.data.length).to.be.greaterThan(0);
      
      const post = data.data[0];
      expect(post).to.have.property('id');
      expect(post).to.have.property('title');
      expect(post).to.have.property('content');
      expect(post).to.have.property('authorAgent');
      expect(post).to.have.property('publishedAt');
      expect(post).to.have.property('metadata');
    });
  });
});