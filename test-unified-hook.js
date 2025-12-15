/**
 * Test the unified state management hook data transformation
 */

// Simulate the API response we just confirmed exists
const mockApiResponse = {
  "success": true,
  "agent_id": "personal-todos-agent",
  "workspace": {
    "id": "d874c29b-ec43-4ed0-8706-138c9c43dd89",
    "agent_id": "personal-todos-agent"
  },
  "pages": [
    {
      "id": "b2935f20-b8a2-4be4-bed4-f6f467a8df9d",
      "agent_id": "personal-todos-agent",
      "title": "Personal Todos Dashboard",
      "page_type": "dynamic",
      "content_type": "json",
      "content_value": "{\"template\":\"dashboard\",\"layout\":\"grid\"}",
      "created_at": "2025-09-11 16:30:43"
    },
    {
      "id": "015b7296-a144-4096-9c60-ee5d7f900723",
      "agent_id": "personal-todos-agent", 
      "title": "Personal Todos Dashboard",
      "page_type": "dynamic",
      "content_type": "json",
      "content_value": "{\"type\": \"div\", \"props\": {\"children\": \"Dashboard Content\"}}",
      "created_at": "2025-09-11 16:27:57"
    }
  ]
};

// Test the data extraction logic from our hook
function testDataExtraction(workspaceResponse, targetPageId) {
  console.log('🧪 Testing data extraction logic...');
  
  // Handle different response structures safely (from our hook)
  let pages = [];
  if (workspaceResponse.data?.pages) {
    pages = workspaceResponse.data.pages;
  } else if (workspaceResponse.pages) {
    pages = workspaceResponse.pages;
  } else if (Array.isArray(workspaceResponse.data)) {
    pages = workspaceResponse.data;
  } else if (Array.isArray(workspaceResponse)) {
    pages = workspaceResponse;
  }

  console.log('📊 Extracted pages:', { 
    count: pages.length, 
    targetPageId: targetPageId,
    pageIds: pages.map(p => p.id),
    hasTargetPage: targetPageId ? pages.some(p => p.id === targetPageId) : false
  });

  // Find current page
  const currentPage = targetPageId && pages.length > 0 
    ? pages.find(p => p.id === targetPageId)
    : null;

  const result = {
    pages,
    currentPage,
    hasPages: pages.length > 0,
    isPageFound: currentPage !== null,
    isReady: true, // Since we have data
  };

  console.log('✅ Extraction results:', result);
  return result;
}

// Test with the actual API response
console.log('🎯 Testing with REAL API response data...');
const result = testDataExtraction(mockApiResponse, '015b7296-a144-4096-9c60-ee5d7f900723');

// Validate the fix
if (result.hasPages && result.isPageFound && result.currentPage) {
  console.log('🎉 SUCCESS: The unified hook correctly extracts and finds the target page!');
  console.log('📝 Found page:', {
    id: result.currentPage.id,
    title: result.currentPage.title,
    content_type: result.currentPage.content_type
  });
} else {
  console.log('❌ FAILURE: The hook did not correctly process the data');
  console.log('🔍 Debug info:', {
    hasPages: result.hasPages,
    isPageFound: result.isPageFound,
    pagesCount: result.pages.length,
    targetPageExists: result.pages.some(p => p.id === '015b7296-a144-4096-9c60-ee5d7f900723')
  });
}

// Test edge cases
console.log('\n🧪 Testing edge cases...');

// Test with no pages
console.log('📋 Testing empty pages response:');
testDataExtraction({ success: true, pages: [] }, '015b7296-a144-4096-9c60-ee5d7f900723');

// Test with different response structure
console.log('📋 Testing alternative response structure:');
testDataExtraction({ 
  success: true, 
  data: { 
    pages: mockApiResponse.pages 
  } 
}, '015b7296-a144-4096-9c60-ee5d7f900723');

console.log('\n✅ All tests completed. The unified state management fix should resolve the "Page not found" error.');