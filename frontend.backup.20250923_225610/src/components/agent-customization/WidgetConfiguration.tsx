import React, { useState, useCallback } from 'react';
import { 
  Layout,
  Plus,
  Minus,
  Settings,
  Move,
  Eye,
  EyeOff,
  RefreshCw,
  BarChart3,
  Activity,
  Clock,
  Target,
  TrendingUp,
  Users,
  MessageSquare,
  Calendar,
  Zap,
  Brain,
  Star,
  Award,
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  GripVertical,
  Edit3,
  Copy,
  Trash2,
  Download,
  Upload
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';
import { AgentWidget } from '@/components/AgentHomePage';

export interface WidgetTemplate {
  id: string;
  type: 'metric' | 'chart' | 'activity' | 'quick-action' | 'custom';
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultSize: { w: number; h: number };
  configurable: boolean;
  category: 'analytics' | 'activity' | 'engagement' | 'utility' | 'custom';
  isDefault?: boolean;
  isPremium?: boolean;
}

export interface WidgetConfig extends AgentWidget {
  refreshInterval: number;
  dataSource?: string;
  displayOptions?: {
    showLabels?: boolean;
    showValues?: boolean;
    colorScheme?: string;
    chartType?: 'line' | 'bar' | 'pie' | 'area';
    timeRange?: '1h' | '24h' | '7d' | '30d';
  };
  filters?: Record<string, any>;
  customCSS?: string;
}

interface WidgetConfigurationProps {
  widgets: WidgetConfig[];
  availableTemplates?: WidgetTemplate[];
  onWidgetsChange: (widgets: WidgetConfig[]) => void;
  maxWidgets?: number;
  gridCols?: number;
  className?: string;
}

const DEFAULT_WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'tasks-today',
    type: 'metric',
    name: 'Tasks Today',
    description: 'Number of tasks completed today',
    icon: Target,
    defaultSize: { w: 2, h: 1 },
    configurable: true,
    category: 'analytics',
    isDefault: true
  },
  {
    id: 'success-rate',
    type: 'metric',
    name: 'Success Rate',
    description: 'Overall task success percentage',
    icon: CheckCircle,
    defaultSize: { w: 2, h: 1 },
    configurable: true,
    category: 'analytics',
    isDefault: true
  },
  {
    id: 'response-time',
    type: 'metric',
    name: 'Response Time',
    description: 'Average response time in seconds',
    icon: Zap,
    defaultSize: { w: 2, h: 1 },
    configurable: true,
    category: 'analytics'
  },
  {
    id: 'performance-chart',
    type: 'chart',
    name: 'Performance Chart',
    description: 'Performance trends over time',
    icon: BarChart3,
    defaultSize: { w: 4, h: 2 },
    configurable: true,
    category: 'analytics'
  },
  {
    id: 'recent-activity',
    type: 'activity',
    name: 'Recent Activity',
    description: 'Latest tasks and activities',
    icon: Activity,
    defaultSize: { w: 3, h: 2 },
    configurable: true,
    category: 'activity',
    isDefault: true
  },
  {
    id: 'engagement-stats',
    type: 'chart',
    name: 'Engagement Stats',
    description: 'User interaction metrics',
    icon: Users,
    defaultSize: { w: 3, h: 2 },
    configurable: true,
    category: 'engagement'
  },
  {
    id: 'quick-actions',
    type: 'quick-action',
    name: 'Quick Actions',
    description: 'Frequently used action buttons',
    icon: Zap,
    defaultSize: { w: 2, h: 1 },
    configurable: true,
    category: 'utility',
    isDefault: true
  },
  {
    id: 'capabilities-overview',
    type: 'custom',
    name: 'Capabilities Overview',
    description: 'Agent skills and expertise',
    icon: Brain,
    defaultSize: { w: 4, h: 2 },
    configurable: true,
    category: 'utility'
  },
  {
    id: 'satisfaction-rating',
    type: 'metric',
    name: 'Satisfaction Rating',
    description: 'User satisfaction score',
    icon: Star,
    defaultSize: { w: 2, h: 1 },
    configurable: true,
    category: 'engagement'
  },
  {
    id: 'achievements',
    type: 'custom',
    name: 'Achievements',
    description: 'Milestones and badges earned',
    icon: Award,
    defaultSize: { w: 3, h: 2 },
    configurable: true,
    category: 'engagement'
  },
  {
    id: 'uptime-monitor',
    type: 'metric',
    name: 'Uptime Monitor',
    description: 'System availability percentage',
    icon: Clock,
    defaultSize: { w: 2, h: 1 },
    configurable: true,
    category: 'analytics'
  },
  {
    id: 'message-volume',
    type: 'chart',
    name: 'Message Volume',
    description: 'Communication activity trends',
    icon: MessageSquare,
    defaultSize: { w: 3, h: 2 },
    configurable: true,
    category: 'engagement'
  }
];

const REFRESH_INTERVALS = [
  { value: 0, label: 'Manual' },
  { value: 5, label: '5 seconds' },
  { value: 10, label: '10 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
  { value: 900, label: '15 minutes' },
  { value: 3600, label: '1 hour' }
];

const CHART_TYPES = [
  { value: 'line', label: 'Line Chart' },
  { value: 'bar', label: 'Bar Chart' },
  { value: 'area', label: 'Area Chart' },
  { value: 'pie', label: 'Pie Chart' }
];

const TIME_RANGES = [
  { value: '1h', label: 'Last Hour' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' }
];

const WidgetConfiguration: React.FC<WidgetConfigurationProps> = ({
  widgets,
  availableTemplates = DEFAULT_WIDGET_TEMPLATES,
  onWidgetsChange,
  maxWidgets = 12,
  gridCols = 4,
  className = ''
}) => {
  const [selectedWidget, setSelectedWidget] = useState<WidgetConfig | null>(null);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<WidgetConfig | null>(null);
  const [layoutMode, setLayoutMode] = useState<'edit' | 'preview'>('edit');

  const addWidget = useCallback((template: WidgetTemplate) => {
    if (widgets.length >= maxWidgets) {
      alert(`Maximum of ${maxWidgets} widgets allowed`);
      return;
    }

    const newWidget: WidgetConfig = {
      id: `${template.id}-${Date.now()}`,
      type: template.type,
      title: template.name,
      content: {},
      position: {
        x: 0,
        y: Math.max(...widgets.map(w => w.position.y + w.position.h), 0),
        w: template.defaultSize.w,
        h: template.defaultSize.h
      },
      isVisible: true,
      isEditable: template.configurable,
      refreshInterval: 30,
      displayOptions: {
        showLabels: true,
        showValues: true,
        colorScheme: 'blue',
        chartType: 'line',
        timeRange: '24h'
      }
    };

    onWidgetsChange([...widgets, newWidget]);
    setShowTemplateGallery(false);
  }, [widgets, maxWidgets, onWidgetsChange]);

  const removeWidget = useCallback((widgetId: string) => {
    onWidgetsChange(widgets.filter(w => w.id !== widgetId));
    if (selectedWidget?.id === widgetId) {
      setSelectedWidget(null);
    }
  }, [widgets, onWidgetsChange, selectedWidget]);

  const updateWidget = useCallback((widgetId: string, updates: Partial<WidgetConfig>) => {
    onWidgetsChange(widgets.map(w => 
      w.id === widgetId ? { ...w, ...updates } : w
    ));
    
    if (selectedWidget?.id === widgetId) {
      setSelectedWidget(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [widgets, onWidgetsChange, selectedWidget]);

  const duplicateWidget = useCallback((widget: WidgetConfig) => {
    const duplicatedWidget: WidgetConfig = {
      ...widget,
      id: `${widget.id}-copy-${Date.now()}`,
      title: `${widget.title} (Copy)`,
      position: {
        ...widget.position,
        x: (widget.position.x + widget.position.w) % gridCols,
        y: widget.position.y + (widget.position.x + widget.position.w >= gridCols ? widget.position.h : 0)
      }
    };

    onWidgetsChange([...widgets, duplicatedWidget]);
  }, [widgets, onWidgetsChange, gridCols]);

  const moveWidget = useCallback((widgetId: string, direction: 'up' | 'down' | 'left' | 'right') => {
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;

    const newPosition = { ...widget.position };

    switch (direction) {
      case 'up':
        newPosition.y = Math.max(0, newPosition.y - 1);
        break;
      case 'down':
        newPosition.y += 1;
        break;
      case 'left':
        newPosition.x = Math.max(0, newPosition.x - 1);
        break;
      case 'right':
        newPosition.x = Math.min(gridCols - newPosition.w, newPosition.x + 1);
        break;
    }

    updateWidget(widgetId, { position: newPosition });
  }, [widgets, updateWidget, gridCols]);

  const exportLayout = () => {
    const layoutData = {
      widgets: widgets.map(w => ({
        templateId: availableTemplates.find(t => t.name === w.title)?.id,
        position: w.position,
        config: {
          refreshInterval: w.refreshInterval,
          displayOptions: w.displayOptions,
          isVisible: w.isVisible
        }
      })),
      timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(layoutData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'widget-layout.json');
    linkElement.click();
  };

  const importLayout = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const layoutData = JSON.parse(e.target?.result as string);
        const newWidgets: WidgetConfig[] = [];

        layoutData.widgets.forEach((item: any) => {
          const template = availableTemplates.find(t => t.id === item.templateId);
          if (template) {
            const widget: WidgetConfig = {
              id: `${template.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: template.type,
              title: template.name,
              content: {},
              position: item.position,
              isVisible: item.config.isVisible,
              isEditable: template.configurable,
              refreshInterval: item.config.refreshInterval,
              displayOptions: item.config.displayOptions
            };
            newWidgets.push(widget);
          }
        });

        onWidgetsChange(newWidgets);
      } catch (error) {
        alert('Invalid layout file format');
      }
    };
    reader.readAsText(file);
  };

  const getWidgetIcon = (type: string) => {
    switch (type) {
      case 'metric': return BarChart3;
      case 'chart': return TrendingUp;
      case 'activity': return Activity;
      case 'quick-action': return Zap;
      default: return Layout;
    }
  };

  const renderWidgetPreview = (widget: WidgetConfig) => {
    const IconComponent = getWidgetIcon(widget.type);
    
    return (
      <div
        key={widget.id}
        className={cn(
          'bg-white border border-gray-200 rounded-lg p-4 relative group transition-all duration-200',
          layoutMode === 'edit' && 'hover:border-blue-300 hover:shadow-md cursor-pointer',
          selectedWidget?.id === widget.id && 'border-blue-500 bg-blue-50',
          !widget.isVisible && 'opacity-50'
        )}
        style={{
          gridColumnStart: widget.position.x + 1,
          gridColumnEnd: widget.position.x + widget.position.w + 1,
          gridRowStart: widget.position.y + 1,
          gridRowEnd: widget.position.y + widget.position.h + 1,
          minHeight: `${widget.position.h * 120}px`
        }}
        onClick={() => layoutMode === 'edit' && setSelectedWidget(widget)}
      >
        {/* Widget Content */}
        <div className="flex items-start gap-3 h-full">
          <IconComponent className="w-5 h-5 text-gray-400 mt-1" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 text-sm">{widget.title}</h3>
            <div className="mt-2 text-gray-500 text-xs">
              {widget.type === 'metric' && <div>Sample: 42</div>}
              {widget.type === 'chart' && <div className="flex gap-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-2 bg-blue-200 rounded" style={{ height: `${10 + Math.random() * 20}px` }}></div>
                ))}
              </div>}
              {widget.type === 'activity' && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Task completed</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Task started</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Widget Controls */}
        {layoutMode === 'edit' && (
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateWidget(widget.id, { isVisible: !widget.isVisible });
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title={widget.isVisible ? 'Hide' : 'Show'}
            >
              {widget.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                duplicateWidget(widget);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Duplicate"
            >
              <Copy className="w-3 h-3" />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeWidget(widget.id);
              }}
              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded"
              title="Remove"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Refresh Indicator */}
        {widget.refreshInterval > 0 && (
          <div className="absolute bottom-2 left-2">
            <RefreshCw className="w-3 h-3 text-gray-300" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Widget Configuration</h3>
          <p className="text-sm text-gray-600">
            Customize your dashboard with {widgets.length}/{maxWidgets} widgets
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center border border-gray-200 rounded-lg">
            <button
              onClick={() => setLayoutMode('edit')}
              className={cn(
                'px-3 py-2 text-sm font-medium',
                layoutMode === 'edit'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              )}
            >
              Edit
            </button>
            <button
              onClick={() => setLayoutMode('preview')}
              className={cn(
                'px-3 py-2 text-sm font-medium',
                layoutMode === 'preview'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              )}
            >
              Preview
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".json"
              onChange={importLayout}
              className="hidden"
              id="import-layout"
            />
            <label
              htmlFor="import-layout"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </label>
            
            <button
              onClick={exportLayout}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>

            <button
              onClick={() => setShowTemplateGallery(true)}
              disabled={widgets.length >= maxWidgets}
              className={cn(
                'inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white',
                widgets.length >= maxWidgets
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Widget
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget Grid */}
        <div className="lg:col-span-2">
          <div className="bg-gray-50 rounded-lg p-4">
            <div 
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                gridAutoRows: '120px'
              }}
            >
              {widgets.map(renderWidgetPreview)}
            </div>
            
            {widgets.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Layout className="mx-auto h-12 w-12 mb-4" />
                <p>No widgets configured yet</p>
                <p className="text-sm">Click "Add Widget" to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Widget Settings */}
        <div className="space-y-4">
          {selectedWidget ? (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Widget Settings</h4>
                <button
                  onClick={() => setSelectedWidget(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Basic Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={selectedWidget.title}
                    onChange={(e) => updateWidget(selectedWidget.id, { title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Refresh Interval</label>
                  <select
                    value={selectedWidget.refreshInterval}
                    onChange={(e) => updateWidget(selectedWidget.id, { refreshInterval: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    {REFRESH_INTERVALS.map(interval => (
                      <option key={interval.value} value={interval.value}>
                        {interval.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Display Options for Charts */}
                {selectedWidget.type === 'chart' && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700">Chart Options</h5>
                    
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Chart Type</label>
                      <select
                        value={selectedWidget.displayOptions?.chartType || 'line'}
                        onChange={(e) => updateWidget(selectedWidget.id, {
                          displayOptions: {
                            ...selectedWidget.displayOptions,
                            chartType: e.target.value as any
                          }
                        })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      >
                        {CHART_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Time Range</label>
                      <select
                        value={selectedWidget.displayOptions?.timeRange || '24h'}
                        onChange={(e) => updateWidget(selectedWidget.id, {
                          displayOptions: {
                            ...selectedWidget.displayOptions,
                            timeRange: e.target.value as any
                          }
                        })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      >
                        {TIME_RANGES.map(range => (
                          <option key={range.value} value={range.value}>
                            {range.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Position Controls */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600">Width</label>
                      <input
                        type="number"
                        min="1"
                        max={gridCols}
                        value={selectedWidget.position.w}
                        onChange={(e) => updateWidget(selectedWidget.id, {
                          position: {
                            ...selectedWidget.position,
                            w: parseInt(e.target.value)
                          }
                        })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Height</label>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={selectedWidget.position.h}
                        onChange={(e) => updateWidget(selectedWidget.id, {
                          position: {
                            ...selectedWidget.position,
                            h: parseInt(e.target.value)
                          }
                        })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Move Controls */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Move Widget</label>
                  <div className="grid grid-cols-3 gap-1">
                    <div></div>
                    <button
                      onClick={() => moveWidget(selectedWidget.id, 'up')}
                      className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      ↑
                    </button>
                    <div></div>
                    <button
                      onClick={() => moveWidget(selectedWidget.id, 'left')}
                      className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      ←
                    </button>
                    <div className="p-2 border border-gray-200 rounded bg-gray-50 text-center text-xs text-gray-500">
                      Move
                    </div>
                    <button
                      onClick={() => moveWidget(selectedWidget.id, 'right')}
                      className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      →
                    </button>
                    <div></div>
                    <button
                      onClick={() => moveWidget(selectedWidget.id, 'down')}
                      className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      ↓
                    </button>
                    <div></div>
                  </div>
                </div>

                {/* Visibility Toggle */}
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Visible</div>
                    <div className="text-xs text-gray-500">Show this widget on the dashboard</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedWidget.isVisible}
                      onChange={(e) => updateWidget(selectedWidget.id, { isVisible: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-center text-gray-500 py-8">
                <Settings className="mx-auto h-8 w-8 mb-3" />
                <p className="text-sm">Select a widget to configure its settings</p>
              </div>
            </div>
          )}

          {/* Widget Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-3">Layout Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Widgets</span>
                <span className="font-medium">{widgets.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Visible Widgets</span>
                <span className="font-medium">{widgets.filter(w => w.isVisible).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Auto Refresh</span>
                <span className="font-medium">{widgets.filter(w => w.refreshInterval > 0).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Template Gallery Modal */}
      {showTemplateGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Widget Templates</h3>
                  <p className="text-sm text-gray-600">Choose widgets to add to your dashboard</p>
                </div>
                <button
                  onClick={() => setShowTemplateGallery(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                    onClick={() => addWidget(template)}
                  >
                    <div className="flex items-start gap-3">
                      <template.icon className="w-6 h-6 text-blue-600 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-gray-900">{template.name}</h4>
                          <div className="flex gap-1">
                            {template.isDefault && <Badge variant="secondary">Default</Badge>}
                            {template.isPremium && <Badge variant="default">Premium</Badge>}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-500 capitalize">{template.category}</span>
                          <span className="text-xs text-gray-500">
                            {template.defaultSize.w} × {template.defaultSize.h}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WidgetConfiguration;