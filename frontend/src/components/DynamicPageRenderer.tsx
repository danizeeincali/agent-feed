import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar as CalendarIcon,
  User,
  Tag,
  Settings,
  Eye
} from 'lucide-react';
import { ComponentSchemas } from '../schemas/componentSchemas';
import { ZodError } from 'zod';
import { ValidationError } from './ValidationError';
import PhotoGrid from './dynamic-page/PhotoGrid';
import SwipeCard from './dynamic-page/SwipeCard';
import Checklist from './dynamic-page/Checklist';
import Calendar from './dynamic-page/Calendar';
import MarkdownRenderer from './dynamic-page/MarkdownRenderer';
import Sidebar from './dynamic-page/Sidebar';
import GanttChart from './dynamic-page/GanttChart';

/**
 * Generate a kebab-case ID from a title string
 * Handles special characters, numbers, Unicode
 * @param title - The header title text
 * @param fallback - Fallback ID if title is invalid
 * @returns A URL-safe kebab-case ID
 */
const generateIdFromTitle = (title: string, fallback: string = 'header'): string => {
  if (!title || typeof title !== 'string') return fallback;

  return title
    .toLowerCase()
    .trim()
    // Normalize Unicode (é → e, ñ → n)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace special chars and spaces with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Truncate to reasonable length
    .substring(0, 50)
    // Fallback if empty after processing
    || fallback;
};

/**
 * TabsComponent - Separate component to properly use React hooks
 * Fixes hooks violation by moving useState to component top level
 */
interface TabsComponentProps {
  id?: string;
  tabs?: Array<{ label: string; content: string }>;
  className?: string;
}

const TabsComponent: React.FC<TabsComponentProps> = ({ id, tabs, className }) => {
  const [activeTab, setActiveTab] = useState(0);

  const tabsData = tabs || [
    { label: "Tab 1", content: "Content 1" },
    { label: "Tab 2", content: "Content 2" }
  ];

  return (
    <div id={id} className={`bg-white rounded-lg border border-gray-200 ${className || ''}`}>
      <div role="tablist" className="flex border-b">
        {tabsData.map((tab, idx) => (
          <button
            key={idx}
            role="tab"
            aria-selected={activeTab === idx}
            aria-controls={`tabpanel-${id || 'tabs'}-${idx}`}
            id={`tab-${id || 'tabs'}-${idx}`}
            onClick={() => setActiveTab(idx)}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === idx
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`tabpanel-${id || 'tabs'}-${activeTab}`}
        aria-labelledby={`tab-${id || 'tabs'}-${activeTab}`}
        className="p-6"
      >
        {tabsData[activeTab]?.content}
      </div>
    </div>
  );
};

interface ComponentConfig {
  type: string;
  props?: any;
  children?: ComponentConfig[];
}

interface DynamicPageData {
  id: string;
  agentId?: string;
  agent_id?: string;
  title: string;
  version?: string | number;
  layout?: "sidebar" | "single-column" | "two-column" | any[];
  components?: ComponentConfig[];
  specification?: string | any;
  metadata?: {
    description?: string;
    tags?: string[];
    icon?: string;
  };
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
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

  /**
   * Generates a stable React key for a component
   * Avoids Math.random() to prevent unnecessary re-renders
   */
  const generateComponentKey = (type: string, index: number, props: any): string => {
    // Priority 1: Explicit key prop
    if (props?.key) return props.key;

    // Priority 2: ID prop
    if (props?.id) return `${type}-${props.id}`;

    // Priority 3: Index-based key (stable across renders)
    return `${type}-${index}`;
  };

  /**
   * Extracts components array from various data sources with priority fallback
   */
  const extractComponentsArray = (pageData: DynamicPageData): ComponentConfig[] | null => {
    if (!pageData) return null;

    // Priority 1: Check specification field (new format)
    if (pageData.specification !== null && pageData.specification !== undefined) {
      try {
        const spec = typeof pageData.specification === 'string'
          ? JSON.parse(pageData.specification)
          : pageData.specification;

        if (spec && typeof spec === 'object' && Array.isArray(spec.components) && spec.components.length > 0) {
          return spec.components;
        }
      } catch (parseError) {
        console.warn('Failed to parse specification field:', parseError);
        // Continue to fallback options
      }
    }

    // Priority 2: Check direct components array
    if (Array.isArray(pageData.components) && pageData.components.length > 0) {
      return pageData.components;
    }

    // Priority 3: Check legacy layout format
    if (Array.isArray(pageData.layout) && pageData.layout.length > 0) {
      // Convert layout format to components format
      return pageData.layout.map((layoutItem: any) => ({
        type: layoutItem.type,
        props: layoutItem.config || {},
        children: []
      }));
    }

    // No components found
    return null;
  };

  /**
   * Renders error UI for a failed component
   */
  const renderComponentError = (component: ComponentConfig, error: any, index: number): React.ReactNode => {
    return (
      <div key={`error-${index}`} className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Component Error</span>
        </div>
        <div className="text-sm text-red-700 mt-2">
          <div>Type: {component.type}</div>
          <div>Error: {error.message || 'Unknown error'}</div>
        </div>
        <details className="mt-2">
          <summary className="text-xs cursor-pointer text-red-600 hover:text-red-700">View Details</summary>
          <pre className="text-xs mt-2 bg-red-100 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(component, null, 2)}
          </pre>
        </details>
      </div>
    );
  };

  /**
   * Renders empty state when no components are configured
   */
  const renderEmptyState = (): React.ReactNode => {
    return (
      <>
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Eye className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Components Configured
          </h3>
          <p className="text-gray-500 mb-4">
            This page doesn't have any components yet.
          </p>
          <button
            onClick={() => navigate(`/agents/${agentId}/pages/${pageId}/edit`)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Components
          </button>
        </div>

        {pageData?.metadata?.description && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-gray-600">{pageData.metadata.description}</p>
          </div>
        )}
      </>
    );
  };

  /**
   * Main component rendering function with validation
   * Handles depth limiting and circular reference detection
   */
  const renderComponent = (
    config: ComponentConfig,
    index: number,
    depth: number = 0,
    visited: Set<string> = new Set()
  ): React.ReactNode => {
    // Add null/undefined check at the very start
    if (!config || config === null || config === undefined) {
      return null;
    }

    // Prevent infinite recursion
    const MAX_DEPTH = 10;
    if (depth > MAX_DEPTH) {
      console.warn('Max component nesting depth exceeded');
      return null;
    }

    const { type, props = {}, children = [] } = config;

    // Sanitize props - ensure it's an object
    let sanitizedProps = props;
    if (typeof props !== 'object' || Array.isArray(props)) {
      console.warn(`Invalid props for component ${type}:`, props);
      sanitizedProps = {};
    }

    // Detect circular references
    const componentId = `${type}-${index}-${depth}`;
    if (visited.has(componentId)) {
      console.warn('Circular component reference detected');
      return null;
    }

    const newVisited = new Set(visited);
    newVisited.add(componentId);

    // Validate component props with Zod schema
    const schema = ComponentSchemas[type as keyof typeof ComponentSchemas];

    if (schema) {
      try {
        // Validate props with Zod
        const validatedProps = schema.parse(sanitizedProps);

        // Use validatedProps for rendering
        return renderValidatedComponent(type, validatedProps, children, index, depth, newVisited);
      } catch (error) {
        if (error instanceof ZodError) {
          return <ValidationError key={generateComponentKey(type, index, sanitizedProps)} componentType={type} errors={error} />;
        }
        // Re-throw non-Zod errors
        throw error;
      }
    }

    // For components without schemas, proceed with original rendering
    return renderValidatedComponent(type, sanitizedProps, children, index, depth, newVisited);
  };

  /**
   * Renders a validated component with proper children handling
   */
  const renderValidatedComponent = (
    type: string,
    props: any,
    children: ComponentConfig[],
    index: number,
    depth: number = 0,
    visited: Set<string> = new Set()
  ): React.ReactNode => {
    const key = generateComponentKey(type, index, props);

    // Recursively render children
    const renderedChildren = children.map((child, childIndex) =>
      renderComponent(child, childIndex, depth + 1, visited)
    );

    // Component rendering logic
    switch (type) {
      case 'header':
        const HeaderTag = `h${props.level || 1}` as keyof JSX.IntrinsicElements;
        // Auto-generate ID from title if not provided
        const headerId = props.id || generateIdFromTitle(props.title, `header-${index}`);

        return (
          <HeaderTag
            key={key}
            id={headerId}  // Use generated or explicit ID
            className={`font-bold text-gray-900 mb-4 ${
              props.level === 1 ? 'text-3xl' :
              props.level === 2 ? 'text-2xl' :
              props.level === 3 ? 'text-xl' :
              props.level === 4 ? 'text-lg' :
              props.level === 5 ? 'text-base' :
              'text-sm'
            } ${props.className || ''}`}
          >
            {props.title}
            {props.subtitle && (
              <span className="block text-base font-normal text-gray-500 mt-2">
                {props.subtitle}
              </span>
            )}
          </HeaderTag>
        );

      case 'todoList':
        const demoTodos = [
          { id: 1, title: "Example todo item 1", completed: false, priority: "high" },
          { id: 2, title: "Example todo item 2", completed: true, priority: "medium" },
          { id: 3, title: "Example todo item 3", completed: false, priority: "low" }
        ];

        return (
          <div key={key} id={props.id} className="bg-white rounded-lg border border-gray-200 p-6">
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
          <div key={key} id={props.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
          <div key={key} id={props.id} className="bg-white rounded-lg border border-gray-200 p-6">
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
          <div key={key} id={props.id} className="bg-white rounded-lg border border-gray-200 p-6">
            <ListTag className={`space-y-2 ${props.ordered ? 'list-decimal list-inside' : 'list-disc list-inside'}`}>
              {demoItems.map((item: string, idx: number) => (
                <li key={idx} className="text-gray-700">
                  {props.icon && <span className="mr-2">{props.icon}</span>}
                  {item}
                </li>
              ))}
            </ListTag>
          </div>
        );

      case 'form':
        return (
          <div key={key} id={props.id} className="bg-white rounded-lg border border-gray-200 p-6">
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              {props.fields?.map((field: any, idx: number) => (
                <div key={idx}>
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
        return <TabsComponent key={key} id={props.id} tabs={props.tabs} className={props.className} />;

      case 'timeline':
        const demoEvents = props.events || [
          { id: 1, title: "Event 1", date: "2025-09-28", description: "First event" },
          { id: 2, title: "Event 2", date: "2025-09-29", description: "Second event" },
          { id: 3, title: "Event 3", date: "2025-09-30", description: "Third event" }
        ];

        return (
          <div key={key} id={props.id} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="space-y-4">
              {demoEvents.map((event: any, idx: number) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    {idx < demoEvents.length - 1 && <div className="w-0.5 h-full bg-gray-300 my-1"></div>}
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
          <div
            key={key}
            id={props.id}
            className={`bg-white rounded-lg border border-gray-200 p-4 ${props.className || ''}`}
          >
            {props.title && <h3 className="text-lg font-semibold mb-2">{props.title}</h3>}
            {props.description && <p className="text-gray-600 mb-4">{props.description}</p>}
            {renderedChildren}
          </div>
        );

      case 'Grid':
        const gridCols = props.cols || 2;
        return (
          <div key={key} id={props.id} className={`grid grid-cols-${gridCols} gap-4 ${props.className || ''}`}>
            {renderedChildren}
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
          <span key={key} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variants[props.variant as keyof typeof variants] || variants.default}`}>
            {props.children}
          </span>
        );

      case 'Metric':
        return (
          <div key={key} className="text-center">
            <div className="text-2xl font-bold text-gray-900">{props.value}</div>
            <div className="text-sm text-gray-600">{props.label}</div>
            {props.description && <div className="text-xs text-gray-500 mt-1">{props.description}</div>}
          </div>
        );

      case 'ProfileHeader':
        return (
          <div key={key} id={props.id} className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
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
          <div key={key} id={props.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold mb-4">{props.title}</h3>
            <div className="space-y-2">
              {props.capabilities?.map((capability: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
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
          <button key={key} className={`inline-flex items-center px-4 py-2 rounded-md font-medium ${buttonVariants[props.variant as keyof typeof buttonVariants] || buttonVariants.default} ${props.className || ''}`}>
            {props.children}
          </button>
        );

      case 'Container':
        const sizeClasses = {
          sm: 'max-w-2xl',
          md: 'max-w-4xl',
          lg: 'max-w-6xl',
          xl: 'max-w-7xl',
          full: 'max-w-full'
        };
        return (
          <div key={key} id={props.id} className={`mx-auto px-4 ${sizeClasses[props.size as keyof typeof sizeClasses || 'md']} ${props.className || ''}`}>
            {renderedChildren}
          </div>
        );

      case 'Stack':
        const direction = props.direction === 'horizontal' ? 'flex-row' : 'flex-col';
        const spacing = props.spacing || 4;
        return (
          <div key={key} id={props.id} className={`flex ${direction} gap-${spacing} ${props.className || ''}`}>
            {renderedChildren}
          </div>
        );

      case 'DataCard':
        return (
          <div key={key} id={props.id} className={`bg-white rounded-lg border border-gray-200 p-6 ${props.className || ''}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">{props.title}</h3>
              {props.icon && <span className="text-xl">{props.icon}</span>}
            </div>
            <p className="text-2xl font-bold text-gray-900">{props.value || '0'}</p>
            {props.subtitle && <p className="text-sm text-gray-500 mt-1">{props.subtitle}</p>}
            {props.trend && (
              <p className={`text-xs mt-2 ${props.trend === 'up' ? 'text-green-600' : props.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                {props.trend === 'up' ? '↑' : props.trend === 'down' ? '↓' : '→'}
              </p>
            )}
          </div>
        );

      case 'Progress':
        const progressValue = Math.min(props.max || 100, Math.max(0, props.value || 0));
        const progressMax = props.max || 100;
        const percentage = (progressValue / progressMax) * 100;
        const progressVariants = {
          default: 'bg-blue-600',
          success: 'bg-green-600',
          warning: 'bg-yellow-600',
          danger: 'bg-red-600'
        };
        return (
          <div key={key} id={props.id} className={`w-full ${props.className || ''}`}>
            {props.label && <p className="text-sm font-medium text-gray-700 mb-2">{props.label}</p>}
            <div
              className="w-full bg-gray-200 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progressValue}
              aria-valuemin={0}
              aria-valuemax={progressMax}
            >
              <div
                className={`h-full rounded-full ${progressVariants[props.variant as keyof typeof progressVariants || 'default']}`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            {props.showValue && (
              <p className="text-xs text-gray-500 mt-1">{progressValue} / {progressMax}</p>
            )}
          </div>
        );

      case 'PhotoGrid':
        return (
          <PhotoGrid
            key={key}
            images={props.images || []}
            columns={props.columns}
            enableLightbox={props.enableLightbox}
            aspectRatio={props.aspectRatio}
            className={props.className}
          />
        );

      case 'SwipeCard':
        return (
          <SwipeCard
            key={key}
            cards={props.cards || []}
            onSwipeLeft={props.onSwipeLeft}
            onSwipeRight={props.onSwipeRight}
            showControls={props.showControls}
            className={props.className}
          />
        );

      case 'Checklist':
        return (
          <Checklist
            key={key}
            items={props.items || []}
            allowEdit={props.allowEdit}
            onChange={props.onChange}
            className={props.className}
          />
        );

      case 'Calendar':
        return (
          <Calendar
            key={key}
            mode={props.mode}
            selectedDate={props.selectedDate}
            events={props.events}
            className={props.className}
          />
        );

      case 'Markdown':
        return (
          <MarkdownRenderer
            key={key}
            content={props.content || ''}
            className={props.className}
          />
        );

      case 'Sidebar':
        return (
          <Sidebar
            key={key}
            items={props.items || []}
            activeItem={props.activeItem}
            position={props.position}
            collapsible={props.collapsible}
            defaultCollapsed={props.defaultCollapsed}
            className={props.className}
          />
        );

      case 'GanttChart':
        return (
          <GanttChart
            key={key}
            tasks={props.tasks || []}
            viewMode={props.viewMode}
            className={props.className}
          />
        );

      default:
        // For unknown components, render as a placeholder with warning
        return (
          <div key={key} className="p-4 border border-dashed border-yellow-300 rounded-lg bg-yellow-50">
            <div className="text-sm font-medium text-yellow-800 mb-1">
              Unknown Component: {type}
            </div>
            <div className="text-xs text-yellow-600">
              This component type is not registered. Contact support.
            </div>
            {renderedChildren.length > 0 && (
              <div className="mt-3 space-y-2">
                {renderedChildren}
              </div>
            )}
          </div>
        );
    }
  };

  /**
   * Returns layout wrapper function based on layout type
   */
  const getLayoutWrapper = (layoutType: string) => {
    switch (layoutType) {
      case 'sidebar':
        return (components: React.ReactNode[]) => {
          // Find Sidebar component(s)
          const sidebarIndex = components.findIndex((c: any) =>
            c?.type?.displayName === 'Sidebar' || c?.key?.includes('Sidebar')
          );

          if (sidebarIndex === -1) {
            // No sidebar found, fallback to single column
            return <div className="space-y-6">{components}</div>;
          }

          const sidebar = components[sidebarIndex];
          const content = components.filter((_, i) => i !== sidebarIndex);

          return (
            <div className="flex gap-6">
              <aside className="w-64 flex-shrink-0">{sidebar}</aside>
              <main className="flex-1 space-y-6">{content}</main>
            </div>
          );
        };

      case 'two-column':
        return (components: React.ReactNode[]) => (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {components}
          </div>
        );

      case 'single-column':
      default:
        return (components: React.ReactNode[]) => (
          <div className="space-y-6">
            {components}
          </div>
        );
    }
  };

  /**
   * Main content rendering function
   * Orchestrates component extraction, validation, and layout application
   */
  const renderPageContent = () => {
    if (!pageData) return null;

    try {
      // Step 1: Extract components array from various sources
      const componentsArray = extractComponentsArray(pageData);

      // Step 2: Handle empty state
      if (!componentsArray || componentsArray.length === 0) {
        return renderEmptyState();
      }

      // Step 3: Performance warning for large arrays
      if (componentsArray.length > 50) {
        console.warn(
          `Page has ${componentsArray.length} components. ` +
          'Consider splitting into multiple pages for better performance.'
        );
      }

      // Step 4: Render all components with error boundaries
      const renderedComponents: React.ReactNode[] = [];

      componentsArray.forEach((component, index) => {
        try {
          const rendered = renderComponent(component, index);
          if (rendered) {
            renderedComponents.push(rendered);
          }
        } catch (error) {
          console.error(`Failed to render component ${index}:`, error);
          renderedComponents.push(renderComponentError(component, error, index));
        }
      });

      // Step 5: Determine layout type
      const layoutType = typeof pageData.layout === 'string' ? pageData.layout : 'single-column';

      // Step 6: Apply layout wrapper
      const layoutWrapper = getLayoutWrapper(layoutType);
      const layoutContent = layoutWrapper(renderedComponents);

      // Step 7: Return wrapped content with metadata
      return (
        <>
          {layoutContent}

          {pageData.metadata?.description && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-gray-600">{pageData.metadata.description}</p>
            </div>
          )}
        </>
      );
    } catch (err) {
      console.error('Error rendering page content:', err);
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
              <CalendarIcon className="w-3 h-3" />
              Created {new Date(pageData.createdAt || pageData.created_at || '').toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              Updated {new Date(pageData.updatedAt || pageData.updated_at || '').toLocaleDateString()}
            </div>
          </div>
          {pageData.metadata?.tags && pageData.metadata.tags.length > 0 && (
            <div className="flex items-center gap-2">
              <Tag className="w-3 h-3" />
              {pageData.metadata.tags.map((tag, idx) => (
                <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
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
