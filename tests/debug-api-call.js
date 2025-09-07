// Debug script to test the exact API call the frontend is making
console.log('Testing API call from frontend perspective...');

// Test 1: Direct API call
async function testDirectApiCall() {
    console.log('\n1. Testing direct API call to backend...');
    try {
        const response = await fetch('http://localhost:3000/api/v1/agent-posts?limit=20&offset=0&filter=all&search=&sortBy=published_at&sortOrder=DESC');
        console.log('Status:', response.status);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Success:', data.success);
        console.log('Data length:', data.data?.length);
        console.log('Total:', data.total);
        
        return data;
    } catch (error) {
        console.error('Direct API call failed:', error);
        return null;
    }
}

// Test 2: Simulate frontend API service call
async function testFrontendApiService() {
    console.log('\n2. Testing frontend API service logic...');
    
    class TestApiService {
        constructor() {
            this.baseUrl = 'http://localhost:3000/api/v1';
        }
        
        async request(endpoint, options = {}) {
            const url = `${this.baseUrl}${endpoint}`;
            console.log('Making request to:', url);
            
            const config = {
                ...options,
            };

            if (options.body || (!options.method || ['POST', 'PUT', 'PATCH'].includes(options.method))) {
                config.headers = {
                    'Content-Type': 'application/json',
                    ...options.headers,
                };
            } else if (options.headers) {
                config.headers = options.headers;
            }

            try {
                const response = await fetch(url, config);
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                return data;
            } catch (error) {
                console.error(`API request failed: ${endpoint}`, error);
                throw error;
            }
        }
        
        async getAgentPosts(limit = 50, offset = 0, filter = 'all', search = '', sortBy = 'published_at', sortOrder = 'DESC') {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString(),
                filter,
                search,
                sortBy,
                sortOrder
            });
            
            try {
                const response = await this.request(`/agent-posts?${params}`, {}, false);
                console.log('Raw response:', response);
                
                // Normalize the response format for components
                if (response.success && response.data) {
                    return {
                        success: true,
                        data: response.data,
                        total: response.total || response.data.length,
                        posts: response.data // For backward compatibility
                    };
                }
                
                return response;
            } catch (error) {
                console.error('API Error in getAgentPosts:', error);
                return {
                    success: false,
                    data: [],
                    posts: [],
                    total: 0,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }
    }
    
    const testApi = new TestApiService();
    try {
        const result = await testApi.getAgentPosts(20, 0);
        console.log('Frontend API service result:');
        console.log('Success:', result.success);
        console.log('Data length:', result.data?.length);
        console.log('Posts length:', result.posts?.length);
        console.log('Total:', result.total);
        return result;
    } catch (error) {
        console.error('Frontend API service failed:', error);
        return null;
    }
}

// Test 3: Check if posts array is valid for React component
function testPostsArray(posts) {
    console.log('\n3. Testing posts array for React component...');
    
    if (!posts || !Array.isArray(posts)) {
        console.error('Posts is not an array:', typeof posts, posts);
        return false;
    }
    
    console.log('Posts array length:', posts.length);
    
    if (posts.length === 0) {
        console.log('Posts array is empty');
        return false;
    }
    
    // Check first post structure
    const firstPost = posts[0];
    console.log('First post structure:');
    console.log('- id:', firstPost?.id);
    console.log('- title:', firstPost?.title);
    console.log('- authorAgent:', firstPost?.authorAgent);
    console.log('- content length:', firstPost?.content?.length);
    console.log('- publishedAt:', firstPost?.publishedAt);
    
    const requiredFields = ['id', 'title', 'content', 'authorAgent', 'publishedAt'];
    const missingFields = requiredFields.filter(field => !firstPost[field]);
    
    if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        return false;
    }
    
    console.log('Posts array is valid for React component');
    return true;
}

// Run all tests
async function runAllTests() {
    console.log('='.repeat(60));
    console.log('DEBUGGING FRONTEND POSTS NOT SHOWING');
    console.log('='.repeat(60));
    
    // Test 1
    const directResult = await testDirectApiCall();
    
    // Test 2  
    const frontendResult = await testFrontendApiService();
    
    // Test 3
    if (frontendResult && frontendResult.data) {
        testPostsArray(frontendResult.data);
    }
    
    console.log('\n='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log('Direct API call success:', !!directResult);
    console.log('Frontend API service success:', !!frontendResult);
    console.log('Posts data available:', !!(frontendResult?.data?.length));
    
    if (directResult && frontendResult) {
        console.log('\n✅ Both API calls succeeded');
        console.log('Direct API posts:', directResult.data?.length);
        console.log('Frontend API posts:', frontendResult.data?.length);
        
        if (directResult.data?.length === frontendResult.data?.length) {
            console.log('✅ Post counts match - API service is working correctly');
            console.log('\n🔍 The issue is likely in the React component rendering logic');
        } else {
            console.log('❌ Post counts do not match - issue in API service normalization');
        }
    }
}

// Run the tests
runAllTests().catch(console.error);