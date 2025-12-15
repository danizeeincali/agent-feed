import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

// Debug component to test if posts render when hardcoded
const DebugPostsDisplay: React.FC = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    console.log('🐛 DebugPostsDisplay: Component mounted');
    loadDebugPosts();
  }, []);

  const loadDebugPosts = async () => {
    console.log('🐛 DebugPostsDisplay: Starting to load posts...');
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getAgentPosts(5, 0);
      console.log('🐛 DebugPostsDisplay: API response received:', response);
      
      setDebugInfo({
        responseType: typeof response,
        responseKeys: Object.keys(response || {}),
        success: response?.success,
        dataType: typeof response?.data,
        dataIsArray: Array.isArray(response?.data),
        dataLength: response?.data?.length,
        firstPostKeys: response?.data?.[0] ? Object.keys(response.data[0]) : [],
        samplePost: response?.data?.[0]
      });
      
      if (response?.success && Array.isArray(response.data)) {
        console.log('🐛 DebugPostsDisplay: Setting posts array with', response.data.length, 'posts');
        setPosts(response.data);
      } else {
        console.error('🐛 DebugPostsDisplay: Invalid response format:', response);
        setError('Invalid response format');
      }
      
    } catch (err) {
      console.error('🐛 DebugPostsDisplay: Error loading posts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  console.log('🐛 DebugPostsDisplay: Render - posts.length =', posts?.length);
  console.log('🐛 DebugPostsDisplay: Render - loading =', loading);
  console.log('🐛 DebugPostsDisplay: Render - error =', error);

  if (loading) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-bold text-yellow-800 mb-2">🐛 Debug: Loading Posts</h3>
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
          <span>Loading debug posts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-bold text-red-800 mb-2">🐛 Debug: Error</h3>
        <p className="text-red-700">{error}</p>
        <button 
          onClick={loadDebugPosts}
          className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Debug Info Panel */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-bold text-blue-800 mb-2">🐛 Debug Information</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <div><strong>Posts Array Length:</strong> {posts?.length || 0}</div>
          <div><strong>Posts Array Type:</strong> {Array.isArray(posts) ? 'Array' : typeof posts}</div>
          <div><strong>Response Success:</strong> {debugInfo.success ? '✅' : '❌'}</div>
          <div><strong>Data Type:</strong> {debugInfo.dataType}</div>
          <div><strong>Data Is Array:</strong> {debugInfo.dataIsArray ? '✅' : '❌'}</div>
          <div><strong>Data Length:</strong> {debugInfo.dataLength}</div>
          <div><strong>First Post Keys:</strong> {debugInfo.firstPostKeys?.join(', ')}</div>
        </div>
        
        {debugInfo.samplePost && (
          <details className="mt-2">
            <summary className="cursor-pointer text-blue-800 font-medium">Sample Post Data</summary>
            <pre className="mt-2 text-xs bg-blue-100 p-2 rounded overflow-auto">
              {JSON.stringify(debugInfo.samplePost, null, 2)}
            </pre>
          </details>
        )}
      </div>

      {/* Posts Display */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">
          🐛 Debug: Posts Rendering ({posts?.length || 0} posts)
        </h3>
        
        {(!posts || posts.length === 0) ? (
          <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-600">No posts to display</p>
            <div className="mt-2 text-sm text-gray-500">
              Posts variable: {String(posts)} (type: {typeof posts})
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post, index) => {
              console.log('🐛 DebugPostsDisplay: Rendering post', index, 'with id:', post?.id);
              
              return (
                <div 
                  key={post?.id || index} 
                  className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {post?.authorAgent?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {post?.title || 'Untitled'}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        by {post?.authorAgent || 'Unknown'} • {post?.publishedAt || 'No date'}
                      </p>
                      <p className="text-gray-700 mt-2 line-clamp-3">
                        {post?.content || 'No content'}
                      </p>
                      <div className="mt-2 text-xs text-gray-500">
                        ID: {post?.id} | Keys: {post ? Object.keys(post).join(', ') : 'None'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <button 
          onClick={loadDebugPosts}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 Reload Debug Posts
        </button>
      </div>
    </div>
  );
};

export default DebugPostsDisplay;