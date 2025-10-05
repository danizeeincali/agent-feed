import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { resolveDataBindings, findUnresolvedBindings } from '../utils/dataBindingResolver';

interface DynamicPageWithDataProps {
  pageId?: string;
  agentId?: string;
}

interface PageSpec {
  id: string;
  agentId: string;
  title: string;
  version: string;
  layout?: any[];
  dataSource?: string;
  metadata?: {
    description?: string;
    tags?: string[];
    icon?: string;
  };
  status?: string;
  createdAt: string;
  updatedAt: string;
}

interface DataSourceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface PageResponse {
  success: boolean;
  page?: PageSpec;
  error?: string;
}

/**
 * DynamicPageWithData Component
 * Fetches page specification and data, resolves bindings, and renders the page
 */
const DynamicPageWithData: React.FC<DynamicPageWithDataProps> = ({
  pageId: propPageId,
  agentId: propAgentId
}) => {
  const params = useParams<{ agentId: string; pageId: string }>();
  const navigate = useNavigate();

  // Use props if provided, otherwise use route params
  const pageId = propPageId || params.pageId;
  const agentId = propAgentId || params.agentId;

  const [pageSpec, setPageSpec] = useState<PageSpec | null>(null);
  const [pageData, setPageData] = useState<any>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  // Fetch page specification
  useEffect(() => {
    const fetchPageSpec = async () => {
      if (!agentId || !pageId) {
        setPageError('Missing agent ID or page ID');
        setLoadingPage(false);
        return;
      }

      try {
        setLoadingPage(true);
        setPageError(null);

        const response = await fetch(`/api/agent-pages/agents/${agentId}/pages/${pageId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setPageError('Page not found');
          } else {
            setPageError(`Failed to load page: ${response.status}`);
          }
          setLoadingPage(false);
          return;
        }

        const result: PageResponse = await response.json();

        if (result.success && result.page) {
          setPageSpec(result.page);
        } else {
          setPageError(result.error || 'Failed to load page');
        }
      } catch (err) {
        setPageError('Network error while loading page');
        console.error('Error fetching page spec:', err);
      } finally {
        setLoadingPage(false);
      }
    };

    fetchPageSpec();
  }, [agentId, pageId]);

  // Fetch data from dataSource
  useEffect(() => {
    const fetchData = async () => {
      if (!pageSpec?.dataSource) {
        // No data source, use empty object
        setPageData({});
        return;
      }

      try {
        setLoadingData(true);
        setDataError(null);

        const response = await fetch(pageSpec.dataSource);

        if (!response.ok) {
          setDataError(`Failed to load data: ${response.status}`);
          setLoadingData(false);
          return;
        }

        const result: DataSourceResponse = await response.json();

        if (result.success && result.data) {
          setPageData(result.data);
        } else {
          setDataError(result.error || 'Failed to load data');
        }
      } catch (err) {
        setDataError('Network error while loading data');
        console.error('Error fetching data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    if (pageSpec) {
      fetchData();
    }
  }, [pageSpec]);

  // Resolve bindings when both page spec and data are loaded
  const resolvedLayout = useMemo(() => {
    if (!pageSpec?.layout || pageData === null) {
      return null;
    }

    try {
      const resolved = resolveDataBindings(pageSpec.layout, pageData, {
        keepOriginalOnError: true
      });

      // Find any unresolved bindings for debugging
      const unresolved = findUnresolvedBindings(resolved);
      if (unresolved.length > 0) {
        console.warn('Unresolved bindings found:', unresolved);
      }

      return resolved;
    } catch (err) {
      console.error('Error resolving bindings:', err);
      return null;
    }
  }, [pageSpec, pageData]);

  // Navigate back
  const handleBack = () => {
    if (agentId) {
      navigate(`/agents/${agentId}`);
    } else {
      navigate(-1);
    }
  };

  // Loading state
  if (loadingPage) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Loading page...</span>
        </div>
      </div>
    );
  }

  // Error state - page not loaded
  if (pageError || !pageSpec) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleBack}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Page</h2>
          <p className="text-gray-500">{pageError || 'Page not found'}</p>
        </div>
      </div>
    );
  }

  // Data loading state
  if (loadingData) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleBack}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{pageSpec.title}</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Loading data...</span>
        </div>
      </div>
    );
  }

  // Error state - data not loaded
  if (dataError) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleBack}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{pageSpec.title}</h1>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-500">{dataError}</p>
        </div>
      </div>
    );
  }

  // Render resolved layout
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pageSpec.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                pageSpec.status === 'published' ? 'bg-green-100 text-green-800' :
                pageSpec.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {pageSpec.status}
              </span>
              <span className="text-xs text-gray-500">v{pageSpec.version}</span>
              {pageSpec.dataSource && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Data-driven
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Page Content */}
      {resolvedLayout ? (
        <div className="space-y-6">
          {/* Render using DynamicPageRenderer logic */}
          <DynamicPageRendererContent layout={resolvedLayout} />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Content</h3>
            <p className="text-gray-500">This page has no layout defined</p>
          </div>
        </div>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && pageData && (
        <details className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-700">Debug: Page Data</summary>
          <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-96">
            {JSON.stringify({ pageSpec, pageData, resolvedLayout }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

/**
 * Simple renderer for resolved layout
 * This is a minimal version - in production, this would use DynamicPageRenderer
 */
const DynamicPageRendererContent: React.FC<{ layout: any[] }> = ({ layout }) => {
  const renderComponent = (component: any, index: number): React.ReactNode => {
    const { type, config = {}, props = {} } = component;
    const componentProps = { ...config, ...props };

    // Simple rendering for common components
    switch (type) {
      case 'header':
        const HeaderTag = `h${componentProps.level || 1}` as keyof JSX.IntrinsicElements;
        return (
          <HeaderTag key={index} className={`font-bold text-gray-900 mb-4 ${
            componentProps.level === 1 ? 'text-3xl' :
            componentProps.level === 2 ? 'text-2xl' :
            componentProps.level === 3 ? 'text-xl' :
            'text-lg'
          }`}>
            {componentProps.title}
          </HeaderTag>
        );

      case 'text':
        return (
          <p key={index} className="text-gray-700">
            {componentProps.content || componentProps.children}
          </p>
        );

      case 'Card':
        return (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
            {componentProps.title && <h3 className="text-lg font-semibold mb-2">{componentProps.title}</h3>}
            {componentProps.description && <p className="text-gray-600">{componentProps.description}</p>}
          </div>
        );

      default:
        // Generic rendering
        return (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-2">Component: {type}</div>
            <pre className="text-sm text-gray-700 overflow-auto">
              {JSON.stringify(componentProps, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {layout.map((component, index) => renderComponent(component, index))}
    </div>
  );
};

export default DynamicPageWithData;
