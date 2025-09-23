import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  Calendar,
  User,
  Tag,
  Settings,
  Eye
} from 'lucide-react';

interface DynamicPageData {
  id: string;
  agent_id: string;
  title: string;
  page_type: string;
  content_type: string;
  content_value: string;
  content_metadata?: any;
  status: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  version: number;
}

interface ComponentConfig {
  type: string;
  props?: any;
  children?: ComponentConfig[];
}

const DynamicPageRenderer: React.FC = () => {
  const { agentId, pageId } = useParams<{ agentId: string; pageId: string }>();
  const navigate = useNavigate();
  const [pageData, setPageData] = useState<DynamicPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPageData = async () => {
      if (!agentId || !pageId) return;

      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/agents/${agentId}/pages/${pageId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setPageData(data.data.page);
          } else {
            setError(data.error || 'Failed to load page');
          }
        } else if (response.status === 404) {
          setError('Page not found');
        } else {
          setError(`Failed to load page: ${response.status}`);
        }
      } catch (err) {
        setError('Network error while loading page');
        console.error('Error fetching page:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, [agentId, pageId]);

  const renderComponent = (config: ComponentConfig): React.ReactNode => {
    const { type, props = {}, children = [] } = config;

    // Basic component rendering - can be expanded with more complex components
    switch (type) {
      case 'Card':
        return (
          <div key={Math.random()} className={`bg-white rounded-lg border border-gray-200 p-4 ${props.className || ''}`}>
            {props.title && <h3 className="text-lg font-semibold mb-2">{props.title}</h3>}
            {props.description && <p className="text-gray-600 mb-4">{props.description}</p>}
            {children.map(child => renderComponent(child))}
          </div>
        );
      
      case 'Grid':
        return (
          <div key={Math.random()} className={`grid grid-cols-${props.cols || 1} gap-${props.gap || 4}`}>
            {children.map(child => renderComponent(child))}
          </div>
        );
      
      case 'Badge':
        const variants = {
          default: 'bg-blue-100 text-blue-800',
          destructive: 'bg-red-100 text-red-800',
          secondary: 'bg-gray-100 text-gray-800',
          outline: 'bg-transparent border border-gray-300 text-gray-700'
        };
        return (
          <span key={Math.random()} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variants[props.variant] || variants.default}`}>
            {props.children}
          </span>
        );
      
      case 'Metric':
        return (
          <div key={Math.random()} className="text-center">
            <div className="text-2xl font-bold text-gray-900">{props.value}</div>
            <div className="text-sm text-gray-600">{props.label}</div>
            {props.description && <div className="text-xs text-gray-500 mt-1">{props.description}</div>}
          </div>
        );
      
      case 'ProfileHeader':
        return (
          <div key={Math.random()} className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl" style={{backgroundColor: props.avatar_color || '#3B82F6'}}>
                {props.name?.charAt(0) || 'A'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{props.name}</h1>
                <p className="text-gray-600">{props.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {props.status}
                  </span>
                  {props.specialization && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {props.specialization}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'CapabilityList':
        return (
          <div key={Math.random()} className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold mb-4">{props.title}</h3>
            <div className="space-y-2">
              {props.capabilities?.map((capability: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">{capability}</span>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'Button':
        const buttonVariants = {
          default: 'bg-blue-600 text-white hover:bg-blue-700',
          destructive: 'bg-red-600 text-white hover:bg-red-700',
          outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
          secondary: 'bg-gray-600 text-white hover:bg-gray-700'
        };
        return (
          <button key={Math.random()} className={`inline-flex items-center px-4 py-2 rounded-md font-medium ${buttonVariants[props.variant] || buttonVariants.default} ${props.className || ''}`}>
            {props.children}
          </button>
        );
      
      default:
        // For unknown components, render as a simple div with content
        return (
          <div key={Math.random()} className="p-2 border border-gray-200 rounded">
            <div className="text-xs text-gray-500 mb-1">Component: {type}</div>
            {props.children && <div className="text-sm">{props.children}</div>}
            {children.map(child => renderComponent(child))}
          </div>
        );
    }
  };

  const renderPageContent = () => {
    if (!pageData) return null;

    try {
      if (pageData.content_type === 'json') {
        const content = JSON.parse(pageData.content_value);
        
        if (content.components && Array.isArray(content.components)) {
          return (
            <div className="space-y-6">
              {content.components.map((component: ComponentConfig) => renderComponent(component))}
            </div>
          );
        }
        
        // Handle simple component structure
        if (content.type) {
          return renderComponent(content);
        }
        
        // Fallback for other JSON structures
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(content, null, 2)}
            </pre>
          </div>
        );
      }
      
      // Handle other content types
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {pageData.content_value}
          </div>
        </div>
      );
    } catch (err) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Content Parse Error</h3>
            <p className="text-gray-500 mb-4">Unable to parse page content</p>
            <details className="text-left">
              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Show raw content</summary>
              <pre className="mt-4 text-xs text-gray-600 bg-gray-50 p-4 rounded overflow-auto">
                {pageData.content_value}
              </pre>
            </details>
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Loading page...</span>
        </div>
      </div>
    );
  }

  if (error || !pageData) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(`/agents/${agentId}`)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Page</h2>
          <p className="text-gray-500">{error || 'Page not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/agents/${agentId}`)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pageData.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                pageData.status === 'published' ? 'bg-green-100 text-green-800' :
                pageData.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {pageData.status}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {pageData.page_type}
              </span>
              <span className="text-xs text-gray-500">v{pageData.version}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate(`/agents/${agentId}/pages/${pageId}/edit`)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Settings className="w-4 h-4 mr-2" />
            Edit
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div className="space-y-6">
        {renderPageContent()}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Created {new Date(pageData.created_at).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              Updated {new Date(pageData.updated_at).toLocaleDateString()}
            </div>
          </div>
          {pageData.tags.length > 0 && (
            <div className="flex items-center gap-2">
              <Tag className="w-3 h-3" />
              {pageData.tags.map((tag, index) => (
                <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DynamicPageRenderer;