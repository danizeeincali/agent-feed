import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings,
  Palette,
  Layout,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Upload,
  Download,
  Plus,
  Minus,
  Edit3,
  Move,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AgentHomePageData, AgentWidget } from '@/components/AgentHomePage';

export interface CustomizationSettings {
  profile: {
    name: string;
    description: string;
    specialization: string;
    welcomeMessage: string;
    avatar: string;
    coverImage?: string;
  };
  theme: {
    primaryColor: string;
    accentColor: string;
    backgroundStyle: 'solid' | 'gradient' | 'pattern';
    layout: 'grid' | 'list' | 'masonry';
    fontFamily: 'system' | 'serif' | 'mono';
    cornerRadius: 'none' | 'small' | 'medium' | 'large';
  };
  widgets: {
    enabled: AgentWidget[];
    layout: { [key: string]: { x: number; y: number; w: number; h: number } };
    refreshIntervals: { [key: string]: number };
  };
  privacy: {
    isPublic: boolean;
    allowComments: boolean;
    showMetrics: boolean;
    showActivity: boolean;
    showCapabilities: boolean;
    allowDataExport: boolean;
  };
  content: {
    customSections: Array<{
      id: string;
      title: string;
      content: string;
      type: 'text' | 'html' | 'markdown';
      isVisible: boolean;
      order: number;
    }>;
    socialLinks: Array<{
      platform: string;
      url: string;
      isVisible: boolean;
    }>;
    tags: string[];
  };
}

interface AgentCustomizationInterfaceProps {
  agentId: string;
  initialData?: Partial<AgentHomePageData>;
  onSave?: (settings: CustomizationSettings) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const DEFAULT_WIDGETS = [
  { id: 'tasks-today', type: 'metric', title: 'Tasks Today', isDefault: true },
  { id: 'success-rate', type: 'metric', title: 'Success Rate', isDefault: true },
  { id: 'response-time', type: 'metric', title: 'Response Time', isDefault: false },
  { id: 'recent-activity', type: 'activity', title: 'Recent Activity', isDefault: true },
  { id: 'performance-chart', type: 'chart', title: 'Performance Chart', isDefault: false },
  { id: 'capabilities', type: 'custom', title: 'Capabilities Overview', isDefault: false }
];

const AgentCustomizationInterface: React.FC<AgentCustomizationInterfaceProps> = ({
  agentId,
  initialData = {},
  onSave,
  onCancel,
  className = ''
}) => {
  const [settings, setSettings] = useState<CustomizationSettings>({
    profile: {
      name: initialData.name || 'AI Assistant Agent',
      description: initialData.description || 'A versatile AI agent designed to help users accomplish tasks efficiently.',
      specialization: initialData.specialization || 'Multi-domain AI assistant',
      welcomeMessage: initialData.welcomeMessage || 'Welcome to my AI workspace!',
      avatar: '🤖',
      coverImage: initialData.coverImage || ''
    },
    theme: {
      primaryColor: initialData.theme?.primaryColor || '#3b82f6',
      accentColor: initialData.theme?.accentColor || '#8b5cf6',
      backgroundStyle: 'gradient',
      layout: initialData.theme?.layout || 'grid',
      fontFamily: 'system',
      cornerRadius: 'medium'
    },
    widgets: {
      enabled: initialData.widgets || [],
      layout: {},
      refreshIntervals: {}
    },
    privacy: {
      isPublic: initialData.visibility?.isPublic ?? true,
      allowComments: initialData.visibility?.allowComments ?? true,
      showMetrics: initialData.visibility?.showMetrics ?? true,
      showActivity: initialData.visibility?.showActivity ?? true,
      showCapabilities: true,
      allowDataExport: true
    },
    content: {
      customSections: [],
      socialLinks: [],
      tags: []
    }
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'theme' | 'widgets' | 'privacy' | 'content'>('profile');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [previewMode, setPreviewMode] = useState(false);

  const handleSettingsChange = useCallback(<T extends keyof CustomizationSettings>(
    section: T,
    updates: Partial<CustomizationSettings[T]>
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }));
    setHasChanges(true);
    setSaveStatus('idle');
  }, []);

  const handleSave = async () => {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await onSave?.(settings);
      setSaveStatus('success');
      setHasChanges(false);
      
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const confirm = window.confirm('Are you sure you want to reset all customizations? This cannot be undone.');
    if (confirm) {
      setSettings({
        profile: {
          name: initialData.name || 'AI Assistant Agent',
          description: initialData.description || '',
          specialization: initialData.specialization || '',
          welcomeMessage: initialData.welcomeMessage || '',
          avatar: '🤖',
          coverImage: ''
        },
        theme: {
          primaryColor: '#3b82f6',
          accentColor: '#8b5cf6',
          backgroundStyle: 'gradient',
          layout: 'grid',
          fontFamily: 'system',
          cornerRadius: 'medium'
        },
        widgets: { enabled: [], layout: {}, refreshIntervals: {} },
        privacy: {
          isPublic: true,
          allowComments: true,
          showMetrics: true,
          showActivity: true,
          showCapabilities: true,
          allowDataExport: true
        },
        content: {
          customSections: [],
          socialLinks: [],
          tags: []
        }
      });
      setHasChanges(true);
    }
  };

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `agent-${agentId}-settings.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        setSettings(importedSettings);
        setHasChanges(true);
      } catch (error) {
        alert('Invalid settings file format');
      }
    };
    reader.readAsText(file);
  };

  const addCustomSection = () => {
    const newSection = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      content: 'Add your custom content here...',
      type: 'text' as const,
      isVisible: true,
      order: settings.content.customSections.length
    };

    handleSettingsChange('content', {
      customSections: [...settings.content.customSections, newSection]
    });
  };

  const removeCustomSection = (sectionId: string) => {
    handleSettingsChange('content', {
      customSections: settings.content.customSections.filter(s => s.id !== sectionId)
    });
  };

  const updateCustomSection = (sectionId: string, updates: Partial<typeof settings.content.customSections[0]>) => {
    handleSettingsChange('content', {
      customSections: settings.content.customSections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    });
  };

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customize Agent Profile</h2>
          <p className="text-gray-600">Personalize your agent's appearance, behavior, and content</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Save Status */}
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Saved successfully</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Save failed</span>
            </div>
          )}

          {/* Action Buttons */}
          <button
            onClick={handleReset}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </button>

          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              className="hidden"
              id="import-settings"
            />
            <label
              htmlFor="import-settings"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </label>
            
            <button
              onClick={handleExportSettings}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>

          <button
            onClick={onCancel}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={cn(
              'inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white',
              hasChanges && !isSaving
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            )}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Change Indicator */}
      {hasChanges && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800">You have unsaved changes</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="widgets" className="flex items-center gap-2">
            <Layout className="w-4 h-4" />
            Widgets
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Content
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agent Name</label>
                <input
                  type="text"
                  value={settings.profile.name}
                  onChange={(e) => handleSettingsChange('profile', { name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter agent name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                <input
                  type="text"
                  value={settings.profile.specialization}
                  onChange={(e) => handleSettingsChange('profile', { specialization: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Data Analysis, Content Creation"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={settings.profile.description}
                  onChange={(e) => handleSettingsChange('profile', { description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your agent's capabilities and purpose"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Welcome Message</label>
                <textarea
                  value={settings.profile.welcomeMessage}
                  onChange={(e) => handleSettingsChange('profile', { welcomeMessage: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Welcome message for visitors to your profile"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Avatar Emoji</label>
                <input
                  type="text"
                  value={settings.profile.avatar}
                  onChange={(e) => handleSettingsChange('profile', { avatar: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="🤖"
                  maxLength={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image URL (Optional)</label>
                <input
                  type="url"
                  value={settings.profile.coverImage || ''}
                  onChange={(e) => handleSettingsChange('profile', { coverImage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/cover-image.jpg"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Theme Tab */}
        <TabsContent value="theme" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Color Scheme */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Color Scheme</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.theme.primaryColor}
                      onChange={(e) => handleSettingsChange('theme', { primaryColor: e.target.value })}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.theme.primaryColor}
                      onChange={(e) => handleSettingsChange('theme', { primaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    {DEFAULT_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => handleSettingsChange('theme', { primaryColor: color })}
                        className="w-6 h-6 rounded border-2 border-gray-200"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.theme.accentColor}
                      onChange={(e) => handleSettingsChange('theme', { accentColor: e.target.value })}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.theme.accentColor}
                      onChange={(e) => handleSettingsChange('theme', { accentColor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Layout Options */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Layout Options</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Layout Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['grid', 'list', 'masonry'] as const).map(layout => (
                      <button
                        key={layout}
                        onClick={() => handleSettingsChange('theme', { layout })}
                        className={cn(
                          'p-3 border border-gray-200 rounded-lg text-center capitalize',
                          settings.theme.layout === layout
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'hover:border-gray-300'
                        )}
                      >
                        {layout}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Corner Radius</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['none', 'small', 'medium', 'large'] as const).map(radius => (
                      <button
                        key={radius}
                        onClick={() => handleSettingsChange('theme', { cornerRadius: radius })}
                        className={cn(
                          'p-2 border border-gray-200 text-sm capitalize',
                          radius === 'none' ? 'rounded-none' :
                          radius === 'small' ? 'rounded-sm' :
                          radius === 'medium' ? 'rounded-md' :
                          'rounded-lg',
                          settings.theme.cornerRadius === radius
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'hover:border-gray-300'
                        )}
                      >
                        {radius}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                  <select
                    value={settings.theme.fontFamily}
                    onChange={(e) => handleSettingsChange('theme', { fontFamily: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="system">System Default</option>
                    <option value="serif">Serif</option>
                    <option value="mono">Monospace</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Background Style */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Background Style</h3>
            <div className="grid grid-cols-3 gap-4">
              {(['solid', 'gradient', 'pattern'] as const).map(style => (
                <button
                  key={style}
                  onClick={() => handleSettingsChange('theme', { backgroundStyle: style })}
                  className={cn(
                    'p-4 border border-gray-200 rounded-lg text-center capitalize',
                    settings.theme.backgroundStyle === style
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'hover:border-gray-300'
                  )}
                >
                  <div className={cn(
                    'w-full h-16 rounded mb-2',
                    style === 'solid' ? 'bg-gray-200' :
                    style === 'gradient' ? 'bg-gradient-to-r from-blue-400 to-purple-500' :
                    'bg-gray-200 bg-opacity-50'
                  )} style={style === 'pattern' ? { 
                    backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  } : {}}></div>
                  {style}
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Widgets Tab */}
        <TabsContent value="widgets" className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Widgets</h3>
            <p className="text-gray-600 mb-6">Choose which widgets to display on your dashboard and configure their settings.</p>
            
            <div className="space-y-4">
              {DEFAULT_WIDGETS.map(widget => {
                const isEnabled = settings.widgets.enabled.some(w => w.id === widget.id);
                
                return (
                  <div key={widget.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newWidget: AgentWidget = {
                              id: widget.id,
                              type: widget.type as any,
                              title: widget.title,
                              content: {},
                              position: { x: 0, y: 0, w: 2, h: 1 },
                              isVisible: true,
                              isEditable: true
                            };
                            handleSettingsChange('widgets', {
                              enabled: [...settings.widgets.enabled, newWidget]
                            });
                          } else {
                            handleSettingsChange('widgets', {
                              enabled: settings.widgets.enabled.filter(w => w.id !== widget.id)
                            });
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{widget.title}</p>
                        <p className="text-sm text-gray-500 capitalize">{widget.type} widget</p>
                      </div>
                    </div>
                    
                    {widget.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                    
                    {isEnabled && (
                      <div className="flex items-center gap-2">
                        <select
                          value={settings.widgets.refreshIntervals[widget.id] || 30}
                          onChange={(e) => handleSettingsChange('widgets', {
                            refreshIntervals: {
                              ...settings.widgets.refreshIntervals,
                              [widget.id]: parseInt(e.target.value)
                            }
                          })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value={10}>10s</option>
                          <option value={30}>30s</option>
                          <option value={60}>1m</option>
                          <option value={300}>5m</option>
                          <option value={0}>Manual</option>
                        </select>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <Move className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy & Visibility Settings</h3>
            
            <div className="space-y-6">
              {Object.entries({
                isPublic: {
                  label: 'Public Profile',
                  description: 'Allow anyone to view your agent profile',
                  icon: Eye
                },
                allowComments: {
                  label: 'Allow Comments',
                  description: 'Let others comment on your posts and updates',
                  icon: Edit3
                },
                showMetrics: {
                  label: 'Show Performance Metrics',
                  description: 'Display performance statistics publicly',
                  icon: Settings
                },
                showActivity: {
                  label: 'Show Activity Feed',
                  description: 'Display recent activities and tasks',
                  icon: Settings
                },
                showCapabilities: {
                  label: 'Show Capabilities',
                  description: 'Display your skills and expertise areas',
                  icon: Settings
                },
                allowDataExport: {
                  label: 'Allow Data Export',
                  description: 'Let users export interaction data',
                  icon: Download
                }
              }).map(([key, config]) => (
                <div key={key} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                  <div className="flex items-start gap-3">
                    <config.icon className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <label className="text-sm font-medium text-gray-900">{config.label}</label>
                      <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.privacy[key as keyof typeof settings.privacy]}
                      onChange={(e) => handleSettingsChange('privacy', { 
                        [key]: e.target.checked 
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Custom Content Sections</h3>
              <button
                onClick={addCustomSection}
                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </button>
            </div>
            
            <div className="space-y-4">
              {settings.content.customSections.map((section, index) => (
                <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateCustomSection(section.id, { title: e.target.value })}
                      className="text-lg font-medium bg-transparent border-none outline-none text-gray-900"
                      placeholder="Section title"
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={section.isVisible}
                          onChange={(e) => updateCustomSection(section.id, { isVisible: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        Visible
                      </label>
                      <button
                        onClick={() => removeCustomSection(section.id)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <select
                      value={section.type}
                      onChange={(e) => updateCustomSection(section.id, { type: e.target.value as any })}
                      className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="text">Plain Text</option>
                      <option value="html">HTML</option>
                      <option value="markdown">Markdown</option>
                    </select>
                  </div>
                  
                  <textarea
                    value={section.content}
                    onChange={(e) => updateCustomSection(section.id, { content: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add your content here..."
                  />
                </div>
              ))}
              
              {settings.content.customSections.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No custom sections yet. Click "Add Section" to create your first one.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgentCustomizationInterface;