import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Loader2, RefreshCw, Edit } from 'lucide-react';
import { apiService } from '../services/api';
import { DynamicPage } from '../types/page.types';

const DynamicAgentPageRenderer: React.FC = () => {
  const { agentId, pageId } = useParams<{ agentId: string; pageId: string }>();
  const navigate = useNavigate();
  const [pageData, setPageData] = useState<DynamicPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPageData = async () => {
    if (!agentId || !pageId) return;

    try {
      setError(null);
      
      // Fetch the dynamic page data from real API
      const response = await apiService.getDynamicPage(agentId, pageId);
      
      if (response.success && response.page) {
        setPageData(response.page);
      } else {
        setError(response.error || 'Page not found');
      }
    } catch (err) {
      setError('Error loading dynamic page');
      console.error('Error fetching page:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchPageData();
  }, [agentId, pageId]);

  // Real-time updates
  useEffect(() => {
    const handlePageUpdate = (data: any) => {
      if (data.agentId === agentId && (data.page?.id === pageId || data.pageId === pageId)) {
        if (data.action === 'deleted') {
          navigate(`/agents/${agentId}`);
        } else {
          fetchPageData(); // Refresh page data
        }
      }
    };

    apiService.on('dynamic_pages_updated', handlePageUpdate);
    
    return () => {
      apiService.off('dynamic_pages_updated', handlePageUpdate);
    };
  }, [agentId, pageId, navigate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPageData();
  };

  const handleEdit = () => {
    // Navigate to edit mode or open edit modal
    console.log('Edit page:', pageData?.id);
  };

  const renderPageContent = () => {
    if (!pageData) return null;

    // Render content based on content_type
    switch (pageData.content_type) {
      case 'markdown':
        return (
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ 
              __html: pageData.content_value || '<p>No content available</p>' 
            }}
          />
        );
      
      case 'component':
        return (
          <div 
            className="dynamic-page-content"
            dangerouslySetInnerHTML={{ 
              __html: pageData.content_value || '<p>No component content available</p>' 
            }}
          />
        );
      
      case 'json':
        try {
          const jsonContent = JSON.parse(pageData.content_value || '{}');
          return (
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
              {JSON.stringify(jsonContent, null, 2)}
            </pre>
          );
        } catch {
          return <p className="text-red-600">Invalid JSON content</p>;
        }
      
      case 'text':
      default:
        return (
          <div className="whitespace-pre-wrap">
            {pageData.content_value || 'No content available'}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/agents/${agentId}`)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Loading dynamic page...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/agents/${agentId}`)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Error Loading Page</h1>
              <p className="text-sm text-gray-600">Agent: {agentId}</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-red-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Page</h2>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/agents/${agentId}`)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Page Not Found</h1>
              <p className="text-sm text-gray-600">Agent: {agentId}</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Page Not Found</h2>
            <p className="text-gray-500">The requested dynamic page could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      published: 'bg-green-100 text-green-800 border-green-200',
      archived: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/agents/${agentId}`)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-gray-900">{pageData.title}</h1>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(pageData.status)}`}>
                  {pageData.status}
                </span>
                <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded">
                  {pageData.page_type}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Agent: {agentId} • {pageData.content_type}
                {pageData.description && ` • ${pageData.description}`}
              </p>
              <p className="text-xs text-gray-500">
                Last updated: {new Date(pageData.updated_at).toLocaleString()}
                {pageData.access_count && ` • ${pageData.access_count} views`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              title="Refresh page"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={handleEdit}
              className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
              title="Edit page"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Page Content */}
      <div className="p-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6">
            {renderPageContent()}
          </div>
        </div>
        
        {/* Metadata */}
        {pageData.metadata && Object.keys(pageData.metadata).length > 0 && (
          <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Page Metadata</h3>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(pageData.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicAgentPageRenderer;