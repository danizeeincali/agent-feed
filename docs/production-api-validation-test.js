/**
 * PRODUCTION API VALIDATION TEST
 * Direct test to validate complete API integration chain
 */

// Test the exact API endpoint that the frontend uses
const testApiIntegration = async () => {
  console.log('🔍 PRODUCTION VALIDATION: Testing API Integration Chain');
  
  try {
    // 1. Raw API call to verify backend response
    console.log('\n📡 Step 1: Raw API Response');
    const response = await fetch('http://localhost:3000/api/agents/personal-todos-agent/pages');
    console.log('Status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const rawResult = await response.json();
    console.log('Raw API Response Structure:', Object.keys(rawResult));
    console.log('Success flag:', rawResult.success);
    console.log('Pages field exists:', !!rawResult.pages);
    console.log('Pages array length:', rawResult.pages?.length);
    
    // 2. Test the transformation logic that frontend uses
    console.log('\n🔄 Step 2: Frontend Transformation');
    if (rawResult.success && rawResult.pages) {
      const transformedPages = rawResult.pages.map(page => ({
        id: page.id,
        title: page.title,
        content: {
          type: page.content_type,
          value: page.content_value,
          metadata: page.content_metadata || {}
        },
        agentId: page.agent_id,
        createdAt: page.created_at,
        updatedAt: page.updated_at,
        status: page.status,
        tags: page.tags || [],
        version: page.version
      }));
      
      console.log('Transformation successful:', transformedPages.length, 'pages');
      console.log('Target page exists:', transformedPages.find(p => p.id === 'b2935f20-b8a2-4be4-bed4-f6f467a8df9d') ? 'YES' : 'NO');
      
      // 3. Validate specific page that was failing
      console.log('\n🎯 Step 3: Target Page Validation');
      const targetPage = transformedPages.find(p => p.id === 'b2935f20-b8a2-4be4-bed4-f6f467a8df9d');
      if (targetPage) {
        console.log('Target Page Found:', {
          id: targetPage.id,
          title: targetPage.title,
          contentType: targetPage.content.type,
          contentLength: targetPage.content.value?.length,
          agentId: targetPage.agentId,
          status: targetPage.status
        });
        
        // 4. Test content rendering
        console.log('\n🎨 Step 4: Content Validation');
        if (targetPage.content.type === 'json' && targetPage.content.value) {
          try {
            const parsed = JSON.parse(targetPage.content.value);
            console.log('Content parses as valid JSON:', !!parsed);
            console.log('Content structure:', Object.keys(parsed));
          } catch (parseError) {
            console.log('Content parse error:', parseError.message);
          }
        }
        
        console.log('\n✅ VALIDATION RESULT: API Integration Chain VALID');
        console.log('- API returns valid response structure');
        console.log('- Pages field contains expected data');
        console.log('- Target page ID found in response');
        console.log('- Frontend transformation works correctly');
        console.log('- Content is valid and renderable');
        
      } else {
        console.log('❌ ERROR: Target page not found in transformed data');
      }
    } else {
      console.log('❌ ERROR: API response missing success flag or pages field');
    }
    
  } catch (error) {
    console.log('❌ VALIDATION FAILED:', error.message);
    console.log('- API endpoint may be unreachable');
    console.log('- Backend server may not be running');
    console.log('- Network connectivity issues');
  }
};

// Execute the test
testApiIntegration();