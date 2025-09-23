/**
 * TDD LONDON SCHOOL: API Data Loading Disconnect Investigation
 * 
 * MISSION: Expose the exact data loading disconnect using direct API calls
 * and simulated component data transformation logic.
 * 
 * NO MOCKS POLICY: Real API calls only
 * 
 * SUCCESS CRITERIA: Tests pass for API layer but fail for component simulation
 * to reveal where the disconnect occurs.
 */

const fetch = require('node-fetch');

// Test configuration
const TEST_CONFIG = {
  agentId: 'personal-todos-agent',
  pageId: '015b7296-a144-4096-9c60-ee5d7f900723',
  expectedTitle: 'Personal Todos Dashboard',
  apiBaseUrl: 'http://localhost:3000',
  timeout: 15000
};

describe('🚨 TDD London School: API Data Loading Disconnect Investigation', () => {
  
  describe('✅ Layer 1: Direct API Contract Validation (Should Pass)', () => {
    
    test('API endpoint returns successful response with target page', async () => {
      // Arrange: Direct API call
      const apiUrl = `${TEST_CONFIG.apiBaseUrl}/api/agents/${TEST_CONFIG.agentId}/pages`;
      
      // Act: Real API call
      const response = await fetch(apiUrl);
      const apiData = await response.json();
      
      // Assert: API contract verification
      expect(response.status).toBe(200);
      expect(apiData.success).toBe(true);
      expect(Array.isArray(apiData.pages)).toBe(true);
      expect(apiData.pages.length).toBeGreaterThan(0);
      
      // Verify target page exists
      const targetPage = apiData.pages.find(p => p.id === TEST_CONFIG.pageId);
      expect(targetPage).toBeDefined();
      expect(targetPage.id).toBe(TEST_CONFIG.pageId);
      expect(targetPage.title).toBe(TEST_CONFIG.expectedTitle);
      
      console.log('✅ API LAYER SUCCESS:', {
        status: response.status,
        success: apiData.success,
        totalPages: apiData.pages.length,
        targetPageFound: !!targetPage,
        targetPageTitle: targetPage?.title,
        targetPageId: targetPage?.id
      });
    }, TEST_CONFIG.timeout);

    test('API response has expected structure and content', async () => {
      // Arrange: API call
      const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/api/agents/${TEST_CONFIG.agentId}/pages`);
      const data = await response.json();
      
      // Assert: Structure validation
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('pages');
      expect(Array.isArray(data.pages)).toBe(true);
      
      const firstPage = data.pages[0];
      expect(firstPage).toHaveProperty('id');
      expect(firstPage).toHaveProperty('title');
      expect(firstPage).toHaveProperty('content_type');
      expect(firstPage).toHaveProperty('content_value');
      
      console.log('✅ API STRUCTURE SUCCESS:', {
        responseKeys: Object.keys(data),
        firstPageKeys: Object.keys(firstPage),
        firstPageSample: {
          id: firstPage.id,
          title: firstPage.title,
          contentType: firstPage.content_type
        }
      });
    }, TEST_CONFIG.timeout);
  });

  describe('🔍 Layer 2: Data Transformation Contract Tests', () => {
    
    test('Component transformation preserves API data', async () => {
      // Arrange: Get real API response
      const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/api/agents/${TEST_CONFIG.agentId}/pages`);
      const backendResponse = await response.json();
      
      // Act: Apply the exact transformation logic that components use
      const simulateComponentTransformation = (apiResponse) => {
        // This mimics the transformation in AgentDynamicPage component
        return {
          success: apiResponse.success,
          data: apiResponse.pages || apiResponse.data || []
        };
      };
      
      const transformed = simulateComponentTransformation(backendResponse);
      
      // Assert: Transformation should preserve all data
      expect(transformed.success).toBe(true);
      expect(Array.isArray(transformed.data)).toBe(true);
      expect(transformed.data.length).toBe(backendResponse.pages.length);
      
      const targetPage = transformed.data.find(p => p.id === TEST_CONFIG.pageId);
      expect(targetPage).toBeDefined();
      expect(targetPage.id).toBe(TEST_CONFIG.pageId);
      expect(targetPage.title).toBe(TEST_CONFIG.expectedTitle);
      
      console.log('✅ TRANSFORMATION SUCCESS:', {
        originalSuccess: backendResponse.success,
        transformedSuccess: transformed.success,
        originalPageCount: backendResponse.pages.length,
        transformedDataCount: transformed.data.length,
        targetPagePreserved: !!targetPage,
        targetPageTitle: targetPage?.title
      });
    }, TEST_CONFIG.timeout);
  });

  describe('💥 Layer 3: Component State Simulation (Expected Disconnect Point)', () => {
    
    test('FAILING: Simulate React component state management', async () => {
      // Arrange: Mock React-like state management
      let componentState = {
        pages: [],
        loading: true,
        error: null,
        selectedPageId: TEST_CONFIG.pageId
      };
      
      const stateHistory = [];
      
      // Simulate setState calls
      const setState = (newState) => {
        componentState = { ...componentState, ...newState };
        stateHistory.push({
          timestamp: Date.now(),
          state: { ...componentState }
        });
        console.log('🔄 State Update:', componentState);
      };
      
      // Simulate useEffect API call
      const simulateComponentAPICall = async () => {
        try {
          console.log('🚀 Simulating component API call...');
          
          const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/api/agents/${TEST_CONFIG.agentId}/pages`);
          const data = await response.json();
          
          console.log('📡 Component received API data:', {
            success: data.success,
            pagesArray: Array.isArray(data.pages),
            pageCount: data.pages?.length || 0,
            firstPageId: data.pages?.[0]?.id
          });
          
          // This is where the disconnect might occur
          if (data.success && data.pages) {
            console.log('✅ About to set pages state with:', data.pages.map(p => ({ id: p.id, title: p.title })));
            setState({ pages: data.pages, error: null });
          } else {
            console.log('❌ API response not in expected format');
            setState({ error: 'Invalid API response' });
          }
          
        } catch (err) {
          console.error('💥 Component API call error:', err);
          setState({ error: err.message });
        } finally {
          setState({ loading: false });
        }
      };
      
      // Act: Execute simulated component lifecycle
      await simulateComponentAPICall();
      
      // Simulate component render logic
      const simulateRender = () => {
        if (componentState.loading) {
          return 'Loading...';
        }
        
        if (componentState.error) {
          return `Error: ${componentState.error}`;
        }
        
        const currentPage = componentState.pages.find(page => page.id === componentState.selectedPageId);
        
        if (!currentPage) {
          console.log('🚨 DISCONNECT DETECTED! Page not found in component state:', {
            pagesInState: componentState.pages.length,
            pagesIds: componentState.pages.map(p => p.id),
            lookingForId: componentState.selectedPageId,
            pagesData: componentState.pages.map(p => ({ id: p.id, title: p.title }))
          });
          return 'Page not found';
        }
        
        return `Page: ${currentPage.title}`;
      };
      
      const renderResult = simulateRender();
      
      // Assert: Component should find and display the page
      console.log('🎬 Final render result:', renderResult);
      console.log('📊 Complete state history:', stateHistory);
      
      // This assertion should PASS but might FAIL, exposing the disconnect
      expect(componentState.error).toBeNull();
      expect(componentState.pages.length).toBeGreaterThan(0);
      expect(componentState.pages.some(p => p.id === TEST_CONFIG.pageId)).toBe(true);
      expect(renderResult).toBe(`Page: ${TEST_CONFIG.expectedTitle}`);
      
    }, TEST_CONFIG.timeout);
  });

  describe('🔬 Layer 4: Data Flow Analysis', () => {
    
    test('FAILING: Trace data from API to component decision point', async () => {
      // Arrange: Create data flow tracer
      const dataFlow = [];
      
      // Step 1: Raw API response
      const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/api/agents/${TEST_CONFIG.agentId}/pages`);
      const rawData = await response.json();
      
      dataFlow.push({
        step: 'RAW_API_RESPONSE',
        data: {
          success: rawData.success,
          pagesCount: rawData.pages?.length,
          hasTargetPage: rawData.pages?.some(p => p.id === TEST_CONFIG.pageId),
          targetPageData: rawData.pages?.find(p => p.id === TEST_CONFIG.pageId)
        }
      });
      
      // Step 2: Component receives data
      const componentProcessedData = rawData.pages || [];
      
      dataFlow.push({
        step: 'COMPONENT_PROCESSING',
        data: {
          receivedArray: Array.isArray(componentProcessedData),
          processedCount: componentProcessedData.length,
          hasTargetPage: componentProcessedData.some(p => p.id === TEST_CONFIG.pageId),
          targetPageData: componentProcessedData.find(p => p.id === TEST_CONFIG.pageId)
        }
      });
      
      // Step 3: State update simulation
      let statePages = [];
      
      // Simulate React setState
      if (rawData.success && rawData.pages) {
        statePages = [...rawData.pages];
      }
      
      dataFlow.push({
        step: 'STATE_UPDATE',
        data: {
          stateCount: statePages.length,
          hasTargetPage: statePages.some(p => p.id === TEST_CONFIG.pageId),
          targetPageData: statePages.find(p => p.id === TEST_CONFIG.pageId)
        }
      });
      
      // Step 4: Render decision
      const targetPageFound = statePages.find(page => page.id === TEST_CONFIG.pageId);
      
      dataFlow.push({
        step: 'RENDER_DECISION',
        data: {
          pageFound: !!targetPageFound,
          renderResult: targetPageFound ? `Page: ${targetPageFound.title}` : 'Page not found'
        }
      });
      
      // Print complete data flow analysis
      console.log('🔍 COMPLETE DATA FLOW ANALYSIS:');
      dataFlow.forEach((step, index) => {
        console.log(`  ${index + 1}. ${step.step}:`, step.data);
      });
      
      // Find the failure point
      const failurePoint = dataFlow.find(step => !step.data.hasTargetPage);
      
      if (failurePoint) {
        console.log('💥 DISCONNECT DETECTED at:', failurePoint.step);
      } else {
        console.log('✅ Data flow successful through all layers');
      }
      
      // Assert: All steps should maintain target page data
      dataFlow.forEach((step, index) => {
        if (index === 0) {
          // First step (raw API) should have the page
          expect(step.data.hasTargetPage).toBe(true);
        } else if (step.step === 'RENDER_DECISION') {
          // Final step should render the page
          expect(step.data.pageFound).toBe(true);
          expect(step.data.renderResult).toBe(`Page: ${TEST_CONFIG.expectedTitle}`);
        } else {
          // All intermediate steps should preserve the page
          expect(step.data.hasTargetPage).toBe(true);
        }
      });
      
    }, TEST_CONFIG.timeout);
  });
});