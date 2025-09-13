/**
 * AgentDynamicRenderer - Production-ready shadcn/ui component renderer
 * Features:
 * - Security validation and sanitization
 * - JSON-to-React component conversion
 * - ComponentRegistry with agent-safe prop handling
 * - Error boundaries and validation
 * - Performance optimization with memoization
 */

import React, { memo, useMemo, ReactNode, ErrorInfo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Info,
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  User,
  Star
} from 'lucide-react';

// Security Configuration
const ALLOWED_HTML_TAGS = [
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'ul', 'ol', 'li', 'br', 'hr'
];

const SAFE_PROPS = [
  'className', 'style', 'children', 'id', 'key', 'title',
  'onClick', 'onChange', 'onSubmit', 'value', 'defaultValue',
  'placeholder', 'disabled', 'required', 'type', 'max', 'min'
];

// Enhanced Component Types
export interface ComponentSpec {
  type: string;
  props: Record<string, any>;
  children?: ComponentSpec[] | string;
  security?: {
    allowedProps?: string[];
    sanitize?: boolean;
    validate?: boolean;
  };
}

export interface PageSpec {
  template: string;
  layout?: string;
  components?: ComponentSpec[];
  data?: Record<string, any>;
  security?: {
    strictMode?: boolean;
    sanitizeContent?: boolean;
  };
}

export interface RenderContext {
  agentId: string;
  pageId?: string;
  userId?: string;
  permissions?: string[];
  data?: Record<string, any>;
}

// Error Boundary for Component Rendering
class ComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Component rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Component Error</AlertTitle>
          <AlertDescription>
            Failed to render component: {this.state.error?.message}
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

// Security Validator
class SecurityValidator {
  static sanitizeProps(props: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    Object.entries(props).forEach(([key, value]) => {
      if (SAFE_PROPS.includes(key)) {
        // Sanitize string values
        if (typeof value === 'string') {
          sanitized[key] = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        } else if (typeof value === 'function') {
          // Allow safe event handlers
          if (key.startsWith('on') && typeof value === 'function') {
            sanitized[key] = value;
          }
        } else {
          sanitized[key] = value;
        }
      }
    });
    
    return sanitized;
  }

  static validateComponentSpec(spec: ComponentSpec): boolean {
    if (!spec.type || typeof spec.type !== 'string') {
      return false;
    }
    
    // Validate against known components
    const allowedComponents = [
      'card', 'button', 'input', 'label', 'textarea', 'badge',
      'progress', 'alert', 'tabs', 'table', 'form', 'metric',
      'chart', 'list', 'grid'
    ];
    
    if (!allowedComponents.includes(spec.type)) {
      return false;
    }
    
    return true;
  }
}

// Component Registry
class ComponentRegistry {
  private static components = new Map<string, React.ComponentType<any>>();
  
  static register(name: string, component: React.ComponentType<any>) {
    this.components.set(name, component);
  }
  
  static get(name: string): React.ComponentType<any> | undefined {
    return this.components.get(name);
  }
  
  static getAll(): Map<string, React.ComponentType<any>> {
    return new Map(this.components);
  }
}

// Built-in Components
const MetricComponent = memo(({ label, value, unit, trend, status }: any) => (
  <Card className="h-full">
    <CardHeader className="pb-2">
      <CardDescription className="text-sm font-medium">{label}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {trend && (
        <div className="flex items-center mt-2">
          {trend.startsWith('+') ? (
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span className={`text-sm ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </span>
        </div>
      )}
      {status && (
        <Badge variant={status === 'excellent' ? 'default' : 'secondary'} className="mt-2">
          {status}
        </Badge>
      )}
    </CardContent>
  </Card>
));

const FormComponent = memo(({ title, fields, onSubmit, data }: any) => {
  const [formData, setFormData] = React.useState(data || {});
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields?.map((field: any, index: number) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.type === 'textarea' ? (
                <Textarea
                  id={field.name}
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              ) : (
                <Input
                  id={field.name}
                  type={field.type || 'text'}
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )}
            </div>
          ))}
          <Button type="submit" className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Submit
          </Button>
        </form>
      </CardContent>
    </Card>
  );
});

const ChartComponent = memo(({ title, chartType, data, height = 300 }: any) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>Chart Type: {chartType}</CardDescription>
    </CardHeader>
    <CardContent>
      <div 
        className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-6 flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center">
          <TrendingUp className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {chartType} chart with {data?.labels?.length || 0} data points
          </p>
          {data?.labels && (
            <div className="mt-2 text-xs text-gray-500">
              Labels: {data.labels.slice(0, 3).join(', ')}
              {data.labels.length > 3 && '...'}
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
));

const TableComponent = memo(({ title, columns, data, actions }: any) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>
        {data?.length || 0} rows, {columns?.length || 0} columns
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns?.map((column: string, index: number) => (
                <TableHead key={index}>{column}</TableHead>
              ))}
              {actions && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.length ? (
              data.slice(0, 5).map((row: any, index: number) => (
                <TableRow key={index}>
                  {columns?.map((column: string, colIndex: number) => (
                    <TableCell key={colIndex}>{row[column] || '-'}</TableCell>
                  ))}
                  {actions && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns?.length + (actions ? 1 : 0)} className="text-center">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
));

const ListComponent = memo(({ title, items, actions }: any) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{items?.length || 0} items</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {items?.length ? (
          items.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {item.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : item.status === 'pending' ? (
                  <Clock className="h-5 w-5 text-yellow-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium">{item.title || item.name}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
              </div>
              {actions && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            No items available
          </div>
        )}
      </div>
      {actions && (
        <div className="mt-4">
          <Button className="w-full" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
));

// Register Built-in Components
ComponentRegistry.register('metric', MetricComponent);
ComponentRegistry.register('form', FormComponent);
ComponentRegistry.register('chart', ChartComponent);
ComponentRegistry.register('table', TableComponent);
ComponentRegistry.register('list', ListComponent);
ComponentRegistry.register('card', Card);
ComponentRegistry.register('button', Button);
ComponentRegistry.register('input', Input);
ComponentRegistry.register('label', Label);
ComponentRegistry.register('textarea', Textarea);
ComponentRegistry.register('badge', Badge);
ComponentRegistry.register('progress', Progress);
ComponentRegistry.register('alert', Alert);
ComponentRegistry.register('tabs', Tabs);

// Main Renderer Component
export interface AgentDynamicRendererProps {
  spec: PageSpec;
  context: RenderContext;
  onDataChange?: (data: any) => void;
  onError?: (error: Error) => void;
}

const AgentDynamicRenderer = memo<AgentDynamicRendererProps>(({ 
  spec, 
  context, 
  onDataChange, 
  onError 
}) => {
  const renderedComponents = useMemo(() => {
    if (!spec || !spec.components) {
      return null;
    }

    const renderComponent = (componentSpec: ComponentSpec, index: number): ReactNode => {
      try {
        // Security validation
        if (!SecurityValidator.validateComponentSpec(componentSpec)) {
          throw new Error(`Invalid component specification: ${componentSpec.type}`);
        }

        // Get component from registry
        const Component = ComponentRegistry.get(componentSpec.type);
        if (!Component) {
          throw new Error(`Unknown component type: ${componentSpec.type}`);
        }

        // Sanitize props
        const sanitizedProps = SecurityValidator.sanitizeProps(componentSpec.props || {});
        
        // Add context data if needed
        if (context.data) {
          sanitizedProps.contextData = context.data;
        }

        // Handle children
        let children = componentSpec.children;
        if (Array.isArray(children)) {
          children = children.map((child, childIndex) => 
            typeof child === 'string' ? child : renderComponent(child, childIndex)
          );
        }

        return (
          <ComponentErrorBoundary key={index} fallback={
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Render Error</AlertTitle>
              <AlertDescription>Failed to render {componentSpec.type} component</AlertDescription>
            </Alert>
          }>
            <Component {...sanitizedProps}>
              {children}
            </Component>
          </ComponentErrorBoundary>
        );
      } catch (error) {
        console.error('Component render error:', error);
        onError?.(error as Error);
        return (
          <Alert key={index} variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Component Error</AlertTitle>
            <AlertDescription>{(error as Error).message}</AlertDescription>
          </Alert>
        );
      }
    };

    return spec.components.map((component, index) => renderComponent(component, index));
  }, [spec, context, onError]);

  // Handle different layouts
  const layoutClass = useMemo(() => {
    switch (spec.layout) {
      case 'grid':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
      case 'list':
        return 'space-y-6';
      case 'masonry':
        return 'columns-1 md:columns-2 lg:columns-3 gap-6';
      default:
        return 'space-y-6';
    }
  }, [spec.layout]);

  if (!spec || !spec.components || spec.components.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>No Components</AlertTitle>
        <AlertDescription>No components defined for this page</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="agent-dynamic-renderer">
      {spec.template === 'dashboard' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Badge variant="outline">Dashboard Template</Badge>
              <Badge variant="secondary" className="ml-2">{spec.layout || 'default'} layout</Badge>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          <Separator />
        </div>
      )}
      
      <div className={layoutClass}>
        {renderedComponents}
      </div>
    </div>
  );
});

AgentDynamicRenderer.displayName = 'AgentDynamicRenderer';

export { ComponentRegistry, SecurityValidator };
export default AgentDynamicRenderer;