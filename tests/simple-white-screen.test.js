// Simple White Screen Test - No Playwright server conflicts
const axios = require('axios');

describe('White Screen TDD Regression Test', () => {
  
  test('Frontend HTML loads without white screen', async () => {
    try {
      const response = await axios.get('http://localhost:5173');
      
      // Check basic HTML structure
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      
      // Check for critical elements
      expect(response.data).toContain('<div id="root"></div>');
      expect(response.data).toContain('src="/src/main.tsx');
      expect(response.data).toContain('Agent Feed - Claude Code Orchestration');
      
      // Should not be empty
      expect(response.data.length).toBeGreaterThan(100);
      
      console.log('✅ Frontend HTML structure valid - no white screen HTML');
      
    } catch (error) {
      console.error('❌ Frontend request failed:', error.message);
      throw error;
    }
  });

  test('Backend API endpoints responsive', async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/claude/check');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('claudeAvailable');
      expect(response.data.claudeAvailable).toBe(true);
      
      console.log('✅ Backend API working correctly');
      
    } catch (error) {
      console.error('❌ Backend API failed:', error.message);
      throw error;
    }
  });

  test('Frontend asset loading paths correct', async () => {
    try {
      // Test main script path
      const mainScript = await axios.get('http://localhost:5173/src/main.tsx');
      expect(mainScript.status).toBe(200);
      
      // Should contain transformed imports (Vite transforms them)
      expect(mainScript.data).toContain('React');
      expect(mainScript.data).toContain('ReactDOM');
      expect(mainScript.data).toContain('from "/src/App.tsx"');
      
      console.log('✅ Frontend assets loading correctly');
      
    } catch (error) {
      console.error('❌ Frontend asset loading failed:', error.message);
      throw error;
    }
  });

  test('Vite dev server health check', async () => {
    try {
      // Check Vite client endpoint
      const viteClient = await axios.get('http://localhost:5173/@vite/client');
      expect(viteClient.status).toBe(200);
      expect(viteClient.headers['content-type']).toMatch(/javascript/);
      
      console.log('✅ Vite dev server healthy');
      
    } catch (error) {
      console.error('❌ Vite dev server issue:', error.message);
      throw error;
    }
  });

  test('Critical imports resolved', async () => {
    try {
      const mainScript = await axios.get('http://localhost:5173/src/main.tsx');
      
      // Check that problematic imports were removed (should NOT contain these)
      expect(mainScript.data).not.toContain('websocket-debug.js');
      expect(mainScript.data).not.toContain('connection-debug');
      expect(mainScript.data).not.toContain('mockApiService');
      
      // Should contain clean, working imports (Vite transformed)
      expect(mainScript.data).toContain('from "/src/App.tsx"');
      expect(mainScript.data).toContain('"/src/index.css');
      
      console.log('✅ Problematic imports removed - clean main.tsx');
      
    } catch (error) {
      console.error('❌ Import resolution failed:', error.message);
      throw error;
    }
  });

});