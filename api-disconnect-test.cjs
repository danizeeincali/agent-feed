/**
 * TDD LONDON SCHOOL: API Data Loading Disconnect Investigation
 * 
 * MISSION: Expose the exact data loading disconnect using direct API calls
 * and simulated component data transformation logic.
 * 
 * NO MOCKS POLICY: Real API calls only
 */

const fetch = require('node-fetch');

// Test configuration
const TEST_CONFIG = {
  agentId: 'personal-todos-agent',
  pageId: '015b7296-a144-4096-9c60-ee5d7f900723',
  expectedTitle: 'Personal Todos Dashboard',
  apiBaseUrl: 'http://localhost:3000'
};

async function runTDDLondonSchoolInvestigation() {
  console.log('🚨 TDD London School: API Data Loading Disconnect Investigation');
  console.log('================================================================');
  
  let testResults = {
    layer1: false,
    layer2: false,
    layer3: false,
    layer4: false,
    disconnectPoint: null
  };
  
  try {
    // ✅ Layer 1: Direct API Contract Validation
    console.log('\n✅ Layer 1: Direct API Contract Validation');
    console.log('-------------------------------------------');
    
    const apiUrl = `${TEST_CONFIG.apiBaseUrl}/api/agents/${TEST_CONFIG.agentId}/pages`;
    console.log('Making API call to:', apiUrl);
    
    const response = await fetch(apiUrl);
    const apiData = await response.json();
    
    console.log('Raw API Response:', {
      status: response.status,
      success: apiData.success,
      totalPages: apiData.pages ? apiData.pages.length : 0,
      responseKeys: Object.keys(apiData)
    });
    
    if (!response.ok || !apiData.success || !apiData.pages) {
      testResults.disconnectPoint = 'Layer 1: API Response Invalid';
      throw new Error('❌ Layer 1 FAILED: API response invalid');
    }
    
    const targetPage = apiData.pages.find(p => p.id === TEST_CONFIG.pageId);
    
    if (!targetPage) {
      testResults.disconnectPoint = 'Layer 1: Target Page Missing from API';
      throw new Error('❌ Layer 1 FAILED: Target page not found in API response');
    }
    
    testResults.layer1 = true;
    console.log('✅ Layer 1 SUCCESS: API returns target page');
    console.log('Target Page Data:', {
      id: targetPage.id,
      title: targetPage.title,
      content_type: targetPage.content_type
    });
    
    // 🔍 Layer 2: Data Transformation Contract Test  
    console.log('\n🔍 Layer 2: Data Transformation Simulation');
    console.log('------------------------------------------');
    
    // This mimics the exact transformation in React components
    const simulateComponentTransformation = (apiResponse) => {
      console.log('Input to transformation:', {
        hasSuccess: 'success' in apiResponse,
        successValue: apiResponse.success,
        hasPages: 'pages' in apiResponse,
        pagesType: typeof apiResponse.pages,
        pagesLength: apiResponse.pages ? apiResponse.pages.length : 0
      });
      
      return {
        success: apiResponse.success,
        data: apiResponse.pages || apiResponse.data || []
      };
    };
    
    const transformed = simulateComponentTransformation(apiData);
    
    console.log('Transformed Data:', {
      success: transformed.success,
      dataType: typeof transformed.data,
      dataLength: transformed.data.length,
      isArray: Array.isArray(transformed.data)
    });
    
    if (!transformed.success || !Array.isArray(transformed.data) || transformed.data.length === 0) {
      testResults.disconnectPoint = 'Layer 2: Data Transformation Failed';
      throw new Error('❌ Layer 2 FAILED: Data transformation failed');
    }
    
    const transformedTargetPage = transformed.data.find(p => p.id === TEST_CONFIG.pageId);
    
    if (!transformedTargetPage) {
      testResults.disconnectPoint = 'Layer 2: Target Page Lost in Transformation';
      throw new Error('❌ Layer 2 FAILED: Target page lost during transformation');
    }
    
    testResults.layer2 = true;
    console.log('✅ Layer 2 SUCCESS: Transformation preserves target page');
    
    // 💥 Layer 3: Component State Management Simulation
    console.log('\n💥 Layer 3: Component State Management Simulation');
    console.log('------------------------------------------------');
    
    // Simulate React component state
    let componentState = {
      pages: [],
      loading: true,
      error: null,
      selectedPageId: TEST_CONFIG.pageId
    };
    
    console.log('Initial component state:', componentState);
    
    // Simulate React setState call after API success
    if (apiData.success && apiData.pages) {
      console.log('Simulating setState with API data...');
      componentState.pages = [...apiData.pages];  // Spread to ensure new array
      componentState.loading = false;
      componentState.error = null;
      
      console.log('State after setState:', {
        pageCount: componentState.pages.length,
        loading: componentState.loading,
        error: componentState.error,
        firstPageId: componentState.pages[0] ? componentState.pages[0].id : 'none'
      });
    } else {
      testResults.disconnectPoint = 'Layer 3: Invalid setState Condition';
      throw new Error('❌ Layer 3 FAILED: setState condition not met');
    }
    
    testResults.layer3 = true;
    console.log('✅ Layer 3 SUCCESS: Component state updated correctly');
    
    // 🎬 Layer 4: Component Render Logic Simulation  
    console.log('\n🎬 Layer 4: Component Render Logic Simulation');
    console.log('--------------------------------------------');
    
    // Simulate the exact render decision logic
    const simulateComponentRender = (state) => {
      console.log('Render function inputs:', {
        loading: state.loading,
        error: state.error,
        pageCount: state.pages.length,
        selectedPageId: state.selectedPageId
      });
      
      if (state.loading) {
        return { result: 'Loading...', status: 'loading' };
      }
      
      if (state.error) {
        return { result: `Error: ${state.error}`, status: 'error' };
      }
      
      console.log('Looking for page with ID:', state.selectedPageId);
      console.log('Available pages:', state.pages.map(p => ({ id: p.id, title: p.title })));
      
      const currentPage = state.pages.find(page => page.id === state.selectedPageId);
      
      if (!currentPage) {
        console.log('🚨 PAGE NOT FOUND IN RENDER!');
        console.log('Search details:', {
          searchingForId: state.selectedPageId,
          availableIds: state.pages.map(p => p.id),
          exactMatches: state.pages.filter(p => p.id === state.selectedPageId).length,
          typeComparison: state.pages.map(p => ({
            id: p.id,
            idType: typeof p.id,
            selectedIdType: typeof state.selectedPageId,
            strictEqual: p.id === state.selectedPageId,
            looseEqual: p.id == state.selectedPageId
          }))
        });
        
        return { result: 'Page not found', status: 'not-found' };
      }
      
      return { result: `Page: ${currentPage.title}`, status: 'success' };
    };
    
    const renderResult = simulateComponentRender(componentState);
    
    console.log('Final render result:', renderResult);
    
    if (renderResult.status === 'not-found') {
      testResults.disconnectPoint = 'Layer 4: Render Logic Page Not Found';
      throw new Error('❌ Layer 4 FAILED: Page not found in render logic - THIS IS THE DISCONNECT!');
    }
    
    if (renderResult.result !== `Page: ${TEST_CONFIG.expectedTitle}`) {
      testResults.disconnectPoint = 'Layer 4: Incorrect Render Result';
      throw new Error(`❌ Layer 4 FAILED: Expected "${TEST_CONFIG.expectedTitle}", got "${renderResult.result}"`);
    }
    
    testResults.layer4 = true;
    console.log('✅ Layer 4 SUCCESS: Render logic works correctly');
    
    console.log('\n🎉 ALL LAYERS SUCCESSFUL');
    console.log('========================');
    console.log('No disconnect detected - the API integration is working correctly');
    console.log('If users are seeing "Page not found", the issue may be:');
    console.log('1. Race conditions in component mounting/unmounting');
    console.log('2. Router parameter mismatches');
    console.log('3. Conditional rendering issues');
    console.log('4. State management timing issues');
    
  } catch (error) {
    console.error('\n💥 DISCONNECT DETECTED!');
    console.error('========================');
    console.error('Error:', error.message);
    console.error('Disconnect Point:', testResults.disconnectPoint);
    
    console.log('\n📊 Test Results Summary:');
    console.log('- Layer 1 (API Contract):', testResults.layer1 ? '✅ PASS' : '❌ FAIL');
    console.log('- Layer 2 (Data Transform):', testResults.layer2 ? '✅ PASS' : '❌ FAIL');
    console.log('- Layer 3 (State Management):', testResults.layer3 ? '✅ PASS' : '❌ FAIL');
    console.log('- Layer 4 (Render Logic):', testResults.layer4 ? '✅ PASS' : '❌ FAIL');
    
    console.log('\n🎯 Debugging Focus:');
    console.log('Focus your debugging efforts on:', testResults.disconnectPoint || 'Unknown layer');
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Check the actual React component implementation');
    console.log('2. Add console.logs to the failing layer');
    console.log('3. Verify data types and object structure');
    console.log('4. Check for async timing issues');
    
    return false;
  }
  
  return true;
}

// Run the investigation
runTDDLondonSchoolInvestigation()
  .then(success => {
    if (success) {
      console.log('\n🏆 Investigation completed successfully');
      process.exit(0);
    } else {
      console.log('\n💥 Investigation revealed disconnect');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Investigation failed:', error);
    process.exit(1);
  });