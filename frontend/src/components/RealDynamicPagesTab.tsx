import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Eye, 
  Settings, 
  FileText, 
  Loader2, 
  AlertCircle,
  Calendar,
  User,
  ExternalLink
} from 'lucide-react';

interface DynamicPage {
  id: string;
  agent_id: string;
  title: string;
  page_type: string;
  content_type: string;
  content_value: string;
  content_metadata?: any;
  status: 'published' | 'draft' | 'archived';
  tags: string[];
  created_at: string;
  updated_at: string;
  version: number;
}

interface RealDynamicPagesTabProps {
  agentId: string;
}

const RealDynamicPagesTab: React.FC<RealDynamicPagesTabProps> = ({ agentId }) => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<DynamicPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchPages = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/agent-pages/agents/${agentId}/pages`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPages(data.pages || []);
        } else {
          setError(data.error || 'Failed to fetch pages');
        }
      } else if (response.status === 404) {
        // No pages yet - this is normal for new agents
        setPages([]);
      } else {
        setError(`Failed to fetch pages: ${response.status}`);
      }
    } catch (err) {
      setError('Network error while fetching pages');
      console.error('Error fetching pages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, [agentId]);

  const handleCreatePage = async () => {
    setCreating(true);
    try {
      const response = await fetch(`/api/agent-pages/agents/${agentId}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Dynamic Page',
          description: 'A new dynamic page for this agent',
          type: 'dashboard',
          content: JSON.stringify({
            type: 'dashboard',
            widgets: []
          })
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await fetchPages(); // Refresh the list
          // Navigate to the new page
          navigate(`/agents/${agentId}/pages/${data.page.id}`);
        } else {
          setError(data.error || 'Failed to create page');
        }
      } else {
        setError(`Failed to create page: ${response.status}`);
      }
    } catch (err) {
      setError('Network error while creating page');
      console.error('Error creating page:', err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" data-testid="loading-spinner" />
          <span className="text-gray-600 dark:text-gray-400">Loading dynamic pages...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Error Loading Pages</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchPages}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dynamic Pages</h3>
        <button
          onClick={handleCreatePage}
          disabled={creating}
          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Create Page
        </button>
      </div>
      
      {pages.length > 0 ? (
        <div className="space-y-4">
          {pages.map((page) => (
            <div key={page.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{page.title}</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      page.status === 'published' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                      page.status === 'draft' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                      'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                    }`}>
                      {page.status}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {page.page_type}
                    </span>
                  </div>
                  {page.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{page.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Created {new Date(page.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Updated {new Date(page.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => navigate(`/agents/${agentId}/pages/${page.id}`)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </button>
                  <button
                    onClick={() => navigate(`/agents/${agentId}/pages/${page.id}/edit`)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Dynamic Pages Yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create dynamic pages for this agent to enhance functionality and provide custom interfaces.
          </p>
          <button
            onClick={handleCreatePage}
            disabled={creating}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Create Your First Page
          </button>
        </div>
      )}

      {pages.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <div>
              {pages.length} page{pages.length !== 1 ? 's' : ''} total
            </div>
            <div className="flex items-center gap-4">
              <span>{pages.filter(p => p.status === 'published').length} published</span>
              <span>{pages.filter(p => p.status === 'draft').length} draft</span>
              <span>{pages.filter(p => p.status === 'archived').length} archived</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealDynamicPagesTab;