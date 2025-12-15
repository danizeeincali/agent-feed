import React, { useState, useEffect } from 'react';
import { 
  Play,
  Settings,
  Palette,
  Layout,
  Shield,
  CheckCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Download,
  Upload,
  Eye,
  Code,
  Monitor,
  Smartphone,
  Tablet,
  ExternalLink,
  Copy,
  Share2,
  Star,
  Heart,
  MessageCircle,
  Zap,
  TrendingUp
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

import AgentHomePage from '@/components/AgentHomePage';
import ProfileSettingsManager from './ProfileSettingsManager';
import { useAgentCustomization } from '../hooks/useAgentCustomization';
import { validateAllSettings } from '../utils/validation';

interface CustomizationDemoProps {
  className?: string;
}

const DEMO_SCENARIOS = [
  {
    id: 'corporate',
    name: 'Corporate Professional',
    description: 'Clean, professional theme for business environments',
    settings: {
      customization: {
        profile: {
          name: 'Executive Assistant AI',
          description: 'Professional AI assistant specialized in executive support, scheduling, and business communications.',
          specialization: 'Executive Support & Business Operations',
          welcomeMessage: 'Welcome! I\'m here to help streamline your business operations and enhance productivity.',
          avatar: '💼'
        },
        theme: {
          primaryColor: '#1e40af',
          accentColor: '#3b82f6',
          backgroundStyle: 'solid',
          layout: 'grid',
          fontFamily: 'system',
          cornerRadius: 'small'
        },
        widgets: {
          enabled: [
            { id: 'tasks-today', type: 'metric', title: 'Today\'s Tasks', isVisible: true },
            { id: 'success-rate', type: 'metric', title: 'Success Rate', isVisible: true },
            { id: 'meetings', type: 'activity', title: 'Upcoming Meetings', isVisible: true }
          ],
          layout: {},
          refreshIntervals: {}
        },
        privacy: {
          isPublic: false,
          allowComments: true,
          showMetrics: true,
          showActivity: false,
          showCapabilities: true,
          allowDataExport: true
        }
      }
    }
  },
  {
    id: 'creative',
    name: 'Creative & Vibrant',
    description: 'Colorful, dynamic theme for creative professionals',
    settings: {
      customization: {
        profile: {
          name: 'Creative Assistant',
          description: 'Dynamic AI assistant for creative professionals, artists, and content creators.',
          specialization: 'Creative Design & Content Creation',
          welcomeMessage: 'Let\'s create something amazing together! I\'m here to fuel your creativity.',
          avatar: '🎨'
        },
        theme: {
          primaryColor: '#ec4899',
          accentColor: '#f59e0b',
          backgroundStyle: 'gradient',
          layout: 'masonry',
          fontFamily: 'rounded',
          cornerRadius: 'large'
        },
        widgets: {
          enabled: [
            { id: 'inspiration', type: 'custom', title: 'Daily Inspiration', isVisible: true },
            { id: 'projects', type: 'activity', title: 'Active Projects', isVisible: true },
            { id: 'creativity-score', type: 'metric', title: 'Creativity Score', isVisible: true }
          ],
          layout: {},
          refreshIntervals: {}
        },
        privacy: {
          isPublic: true,
          allowComments: true,
          showMetrics: true,
          showActivity: true,
          showCapabilities: true,
          allowDataExport: true
        }
      }
    }
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean, minimal design focused on content',
    settings: {
      customization: {
        profile: {
          name: 'Zen Assistant',
          description: 'Minimalist AI assistant focused on clarity, simplicity, and mindful productivity.',
          specialization: 'Mindful Productivity & Focus',
          welcomeMessage: 'Simplicity is the ultimate sophistication. How can I help you focus today?',
          avatar: '🧘'
        },
        theme: {
          primaryColor: '#6b7280',
          accentColor: '#10b981',
          backgroundStyle: 'solid',
          layout: 'list',
          fontFamily: 'serif',
          cornerRadius: 'none'
        },
        widgets: {
          enabled: [
            { id: 'focus-time', type: 'metric', title: 'Focus Time', isVisible: true },
            { id: 'mindfulness', type: 'custom', title: 'Mindful Moments', isVisible: true }
          ],
          layout: {},
          refreshIntervals: {}
        },
        privacy: {
          isPublic: true,
          allowComments: false,
          showMetrics: false,
          showActivity: false,
          showCapabilities: true,
          allowDataExport: true
        }
      }
    }
  }
];

const DEVICE_PREVIEWS = [
  { id: 'desktop', name: 'Desktop', icon: Monitor, width: '100%', maxWidth: '1200px' },
  { id: 'tablet', name: 'Tablet', icon: Tablet, width: '768px', maxWidth: '768px' },
  { id: 'mobile', name: 'Mobile', icon: Smartphone, width: '375px', maxWidth: '375px' }
];

const CustomizationDemo: React.FC<CustomizationDemoProps> = ({ className = '' }) => {
  const [activeScenario, setActiveScenario] = useState(DEMO_SCENARIOS[0].id);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [showSettings, setShowSettings] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [isLivePreview, setIsLivePreview] = useState(true);

  const {
    settings,
    loading,
    saveState,
    updateSettings,
    saveSettings,
    resetToDefaults,
    exportSettings,
    hasUnsavedChanges
  } = useAgentCustomization({
    agentId: 'demo-agent',
    autoSave: false
  });

  // Apply demo scenario
  const applyScenario = (scenarioId: string) => {
    const scenario = DEMO_SCENARIOS.find(s => s.id === scenarioId);
    if (scenario && settings) {
      const updatedSettings = {
        ...settings,
        ...scenario.settings
      };
      updateSettings('customization', scenario.settings.customization);
      setActiveScenario(scenarioId);
    }
  };

  // Validate current settings
  useEffect(() => {
    if (settings) {
      const results = validateAllSettings(settings);
      setValidationResults(results);
    }
  }, [settings]);

  const currentScenario = DEMO_SCENARIOS.find(s => s.id === activeScenario);
  const currentDevice = DEVICE_PREVIEWS.find(d => d.id === previewDevice);

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Agent Customization Demo</h1>
              <p className="text-sm text-gray-600">Test and preview agent profile customization features</p>
            </div>

            <div className="flex items-center gap-3">
              {validationResults && (
                <div className="flex items-center gap-2">
                  {validationResults.errors.length > 0 && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {validationResults.errors.length} Errors
                    </Badge>
                  )}
                  {validationResults.warnings.length > 0 && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      {validationResults.warnings.length} Warnings
                    </Badge>
                  )}
                  {validationResults.isValid && (
                    <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                      <CheckCircle className="w-3 h-3" />
                      Valid
                    </Badge>
                  )}
                </div>
              )}

              <button
                onClick={() => setShowCode(!showCode)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Code className="w-4 h-4 mr-2" />
                {showCode ? 'Hide Code' : 'Show Code'}
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Control Panel */}
          <div className="space-y-6">
            {/* Demo Scenarios */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo Scenarios</h3>
              <div className="space-y-3">
                {DEMO_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => applyScenario(scenario.id)}
                    className={cn(
                      'w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors',
                      activeScenario === scenario.id && 'border-blue-500 bg-blue-50'
                    )}
                  >
                    <div className="font-medium text-gray-900">{scenario.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{scenario.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Device Preview */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Preview</h3>
              <div className="space-y-2">
                {DEVICE_PREVIEWS.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => setPreviewDevice(device.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors',
                      previewDevice === device.id && 'border-blue-500 bg-blue-50'
                    )}
                  >
                    <device.icon className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-900">{device.name}</span>
                    <span className="text-sm text-gray-500 ml-auto">{device.width}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Settings Summary */}
            {settings && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profile Name</span>
                    <span className="font-medium text-gray-900">
                      {settings.customization.profile.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Theme</span>
                    <span className="font-medium text-gray-900 flex items-center gap-1">
                      <div 
                        className="w-3 h-3 rounded border border-gray-300" 
                        style={{ backgroundColor: settings.theme.primaryColor }}
                      ></div>
                      {settings.theme.fontFamily}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Layout</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {settings.theme.layout}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Widgets</span>
                    <span className="font-medium text-gray-900">
                      {settings.widgets.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Privacy</span>
                    <span className="font-medium text-gray-900">
                      {settings.privacy.profileVisibility}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => resetToDefaults()}
                  className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset to Defaults
                </button>
                
                <button
                  onClick={() => exportSettings()}
                  className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Settings
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
                  }}
                  className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy JSON
                </button>
              </div>
            </div>
          </div>

          {/* Preview Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Live Preview</h3>
                  <p className="text-sm text-gray-600">
                    Preview your customizations in real-time on {currentDevice?.name}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {hasUnsavedChanges && (
                    <Badge variant="secondary">
                      Unsaved Changes
                    </Badge>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="livePreview"
                      checked={isLivePreview}
                      onChange={(e) => setIsLivePreview(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="livePreview" className="text-sm text-gray-700">
                      Live Preview
                    </label>
                  </div>

                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </button>
                </div>
              </div>

              {/* Device Frame */}
              <div className="flex justify-center">
                <div 
                  className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-lg transition-all duration-300"
                  style={{ 
                    width: currentDevice?.width,
                    maxWidth: currentDevice?.maxWidth,
                    minHeight: '600px'
                  }}
                >
                  {settings && (
                    <AgentHomePage
                      agentId="demo-agent"
                      data={{
                        name: settings.customization.profile.name,
                        description: settings.customization.profile.description,
                        specialization: settings.customization.profile.specialization,
                        welcomeMessage: settings.customization.profile.welcomeMessage,
                        theme: settings.customization.theme,
                        widgets: settings.customization.widgets.enabled,
                        visibility: settings.customization.privacy
                      }}
                      isEditable={true}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Code View */}
            {showCode && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Configuration</h3>
                <pre className="bg-gray-100 rounded-lg p-4 text-sm overflow-auto max-h-96">
                  <code>{JSON.stringify(settings, null, 2)}</code>
                </pre>
              </div>
            )}

            {/* Validation Results */}
            {validationResults && validationResults.all.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Validation Results</h3>
                <div className="space-y-3">
                  {validationResults.all.map((result: any, index: number) => (
                    <div
                      key={index}
                      className={cn(
                        'flex items-start gap-3 p-3 border rounded-lg',
                        result.severity === 'error' ? 'border-red-200 bg-red-50' :
                        result.severity === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                      )}
                    >
                      {result.severity === 'error' && <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />}
                      {result.severity === 'warning' && <Info className="w-4 h-4 text-yellow-600 mt-0.5" />}
                      {result.severity === 'info' && <Info className="w-4 h-4 text-blue-600 mt-0.5" />}
                      <div>
                        <div className="font-medium text-gray-900">{result.field}</div>
                        <div className="text-sm text-gray-600">{result.message}</div>
                        {result.code && (
                          <div className="text-xs text-gray-500 mt-1">Code: {result.code}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && settings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <ProfileSettingsManager
            agentId="demo-agent"
            onSave={async (newSettings) => {
              await saveSettings(newSettings);
              setShowSettings(false);
            }}
            onCancel={() => setShowSettings(false)}
            isPremium={true}
          />
        </div>
      )}
    </div>
  );
};

export default CustomizationDemo;