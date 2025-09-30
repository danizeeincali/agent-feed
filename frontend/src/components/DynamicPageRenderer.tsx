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
  agentId: string;
  title: string;
  version: string;
  layout?: any[];
  components?: string[];
  metadata?: {
    description?: string;
    tags?: string[];
    icon?: string;
  };
  status?: string;
  createdAt: string;
  updatedAt: string;
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
        
        const response = await fetch(`/api/agent-pages/agents/${agentId}/pages/${pageId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setPageData(data.page);
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
      case 'header':
        const HeaderTag = `h${props.level || 1}` as keyof JSX.IntrinsicElements;
        return (
          <HeaderTag key={Math.random()} className={`font-bold text-gray-900 mb-4 ${
            props.level === 1 ? 'text-3xl' :
            props.level === 2 ? 'text-2xl' :
            props.level === 3 ? 'text-xl' :
            props.level === 4 ? 'text-lg' :
            props.level === 5 ? 'text-base' :
            'text-sm'
          }`}>
            {props.title}
            {props.subtitle && <span className="block text-sm font-normal text-gray-600 mt-1">{props.subtitle}</span>}
          </HeaderTag>
        );

      case 'todoList':
        const demoTodos = [
          { id: 1, title: "Example todo item 1", completed: false, priority: "high" },
          { id: 2, title: "Example todo item 2", completed: true, priority: "medium" },
          { id: 3, title: "Example todo item 3", completed: false, priority: "low" }
        ];

        return (
          <div key={Math.random()} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Sort: {props.sortBy || 'default'}</span>
                {props.showCompleted && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Showing completed</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {demoTodos.map((todo) => (
                <div key={todo.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg">
                  <input type="checkbox" checked={todo.completed} readOnly className="w-4 h-4" />
                  <span className={`flex-1 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {todo.title}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    todo.priority === 'high' ? 'bg-red-100 text-red-700' :
                    todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {todo.priority}
                  </span>
                </div>
              ))}
            </div>
            {props.filterTags && props.filterTags.length > 0 && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                <span className="text-xs text-gray-500">Filters:</span>
                {props.filterTags.map((tag: string, i: number) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{tag}</span>
                ))}
              </div>
            )}
          </div>
        );

      case 'dataTable':
        const demoData = [
          { id: 1, name: "Sample Item 1", status: "Active", value: 100 },
          { id: 2, name: "Sample Item 2", status: "Pending", value: 250 },
          { id: 3, name: "Sample Item 3", status: "Completed", value: 500 }
        ];

        return (
          <div key={Math.random()} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {demoData.map((row) => (
                  <tr key={row.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'stat':
        return (
          <div key={Math.random()} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{props.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{props.value}</p>
                {props.change !== undefined && (
                  <p className={`text-sm mt-2 ${props.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {props.change >= 0 ? '↑' : '↓'} {Math.abs(props.change)}%
                  </p>
                )}
              </div>
              {props.icon && <span className="text-4xl">{props.icon}</span>}
            </div>
            {props.description && <p className="text-xs text-gray-500 mt-3">{props.description}</p>}
          </div>
        );

      case 'list':
        const demoItems = props.items || ["Sample item 1", "Sample item 2", "Sample item 3"];
        const ListTag = props.ordered ? 'ol' : 'ul';

        return (
          <div key={Math.random()} className="bg-white rounded-lg border border-gray-200 p-6">
            <ListTag className={`space-y-2 ${props.ordered ? 'list-decimal list-inside' : 'list-disc list-inside'}`}>
              {demoItems.map((item: string, index: number) => (
                <li key={index} className="text-gray-700">
                  {props.icon && <span className="mr-2">{props.icon}</span>}
                  {item}
                </li>
              ))}
            </ListTag>
          </div>
        );

      case 'form':
        return (
          <div key={Math.random()} className="bg-white rounded-lg border border-gray-200 p-6">
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              {props.fields?.map((field: any, index: number) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input
                    type={field.type || 'text'}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {props.submitLabel || 'Submit'}
              </button>
            </form>
          </div>
        );

      case 'tabs':
        const [activeTab, setActiveTab] = React.useState(0);
        const tabs = props.tabs || [
          { label: "Tab 1", content: "Content 1" },
          { label: "Tab 2", content: "Content 2" }
        ];

        return (
          <div key={Math.random()} className="bg-white rounded-lg border border-gray-200">
            <div className="flex border-b">
              {tabs.map((tab: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === index
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="p-6">{tabs[activeTab]?.content}</div>
          </div>
        );

      case 'timeline':
        const demoEvents = props.events || [
          { id: 1, title: "Event 1", date: "2025-09-28", description: "First event" },
          { id: 2, title: "Event 2", date: "2025-09-29", description: "Second event" },
          { id: 3, title: "Event 3", date: "2025-09-30", description: "Third event" }
        ];

        return (
          <div key={Math.random()} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="space-y-4">
              {demoEvents.map((event: any, index: number) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    {index < demoEvents.length - 1 && <div className="w-0.5 h-full bg-gray-300 my-1"></div>}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-semibold text-gray-900">{event.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{event.date}</p>
                    <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

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
      // Handle layout-based structure (new format)
      if (pageData.layout && Array.isArray(pageData.layout)) {
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Page Components</h3>
              <div className="space-y-4">
                {pageData.layout.map((layoutItem: any) =>
                  renderComponent({
                    type: layoutItem.type,
                    props: layoutItem.config || {},
                    children: []
                  })
                )}
              </div>
            </div>

            {pageData.metadata?.description && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-gray-600">{pageData.metadata.description}</p>
              </div>
            )}
          </div>
        );
      }

      // Fallback: Display as JSON
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Page Data</h3>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded">
            {JSON.stringify(pageData, null, 2)}
          </pre>
        </div>
      );
    } catch (err) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Content Render Error</h3>
            <p className="text-gray-500">Unable to render page content</p>
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
                {pageData.components?.join(', ') || 'custom'}
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
              Created {new Date(pageData.createdAt).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              Updated {new Date(pageData.updatedAt).toLocaleDateString()}
            </div>
          </div>
          {pageData.metadata?.tags && pageData.metadata.tags.length > 0 && (
            <div className="flex items-center gap-2">
              <Tag className="w-3 h-3" />
              {pageData.metadata.tags.map((tag, index) => (
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