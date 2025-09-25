import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Settings,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Download,
  Upload,
  Eye,
  Lock,
  Palette,
  Layout,
  Plus,
  History,
  Share2,
  Bell,
  Shield
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Import our customization components
import AgentCustomizationInterface, { CustomizationSettings } from './AgentCustomizationInterface';
import ThemeCustomizer, { ThemeSettings } from './ThemeCustomizer';
import WidgetConfiguration, { WidgetConfig } from './WidgetConfiguration';
import PrivacySettings, { PrivacySettings as PrivacySettingsType } from './PrivacySettings';
import { AgentHomePageData } from '@/components/AgentHomePage';

export interface ProfileSettings {
  customization: CustomizationSettings;
  theme: ThemeSettings;
  widgets: WidgetConfig[];
  privacy: PrivacySettingsType;
  metadata: {
    version: string;
    lastModified: string;
    createdBy: string;
    tags: string[];
  };
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface SaveState {
  status: 'idle' | 'saving' | 'success' | 'error';
  message?: string;
  errors?: ValidationError[];
  lastSaved?: string;
}

interface ProfileSettingsManagerProps {
  agentId: string;
  initialData?: Partial<AgentHomePageData>;
  onSave?: (settings: ProfileSettings) => Promise<void>;
  onCancel?: () => void;
  onPreview?: (settings: ProfileSettings) => void;
  isPremium?: boolean;
  maxWidgets?: number;
  autoSaveInterval?: number; // in milliseconds
  className?: string;
}

const VALIDATION_RULES = {
  profile: {
    name: { required: true, minLength: 2, maxLength: 100 },
    description: { required: true, minLength: 10, maxLength: 1000 },
    specialization: { required: false, maxLength: 200 },
    welcomeMessage: { required: false, maxLength: 500 }
  },
  theme: {
    primaryColor: { required: true, pattern: /^#[0-9A-F]{6}$/i },
    accentColor: { required: true, pattern: /^#[0-9A-F]{6}$/i }
  },
  widgets: {
    maxCount: 12,
    minRefreshInterval: 5
  }
};

const DEFAULT_SETTINGS: ProfileSettings = {
  customization: {
    profile: {
      name: 'AI Assistant Agent',
      description: 'A versatile AI agent designed to help users accomplish tasks efficiently.',
      specialization: 'Multi-domain AI assistant',
      welcomeMessage: 'Welcome to my AI workspace! I\'m here to help you accomplish your goals.',
      avatar: '🤖'
    },
    theme: {
      primaryColor: '#3b82f6',
      accentColor: '#8b5cf6',
      backgroundStyle: 'gradient',
      layout: 'grid',
      fontFamily: 'system',
      cornerRadius: 'medium'
    },
    widgets: {
      enabled: [],
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
    },
    content: {
      customSections: [],
      socialLinks: [],
      tags: []
    }
  },
  theme: {
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
    accentColor: '#8b5cf6',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderColor: '#e2e8f0',
    fontFamily: 'system',
    fontSize: 'medium',
    fontWeight: 'normal',
    lineHeight: 'normal',
    layout: 'grid',
    spacing: 'normal',
    borderRadius: 'medium',
    shadows: 'medium',
    animations: 'smooth',
    glassmorphism: false,
    gradientBg: false,
    darkMode: 'light'
  },
  widgets: [],
  privacy: {
    profileVisibility: 'public',
    allowDirectContact: true,
    showLastActive: true,
    showOnlineStatus: true,
    allowComments: true,
    moderateComments: false,
    allowSharing: true,
    allowEmbedding: false,
    showPerformanceMetrics: true,
    showActivityFeed: true,
    showCapabilities: true,
    shareAnalytics: false,
    allowDataExport: true,
    dataRetentionDays: 365,
    anonymizeOldData: true,
    allowDataDeletion: true,
    enableAPIAccess: false,
    allowThirdPartyIntegrations: false,
    shareUsageStats: false,
    notifyOnProfileView: false,
    notifyOnMentions: true,
    notifyOnComments: true,
    notifyOnDataExport: true,
    requireAuthentication: false,
    enableTwoFactor: false,
    logAccessAttempts: true,
    sessionTimeout: 30,
    gdprCompliant: true,
    ccpaCompliant: false,
    dataProcessingConsent: true,
    marketingConsent: false
  },
  metadata: {
    version: '1.0.0',
    lastModified: new Date().toISOString(),
    createdBy: 'user',
    tags: []
  }
};

const ProfileSettingsManager: React.FC<ProfileSettingsManagerProps> = ({
  agentId,
  initialData = {},
  onSave,
  onCancel,
  onPreview,
  isPremium = false,
  maxWidgets = 12,
  autoSaveInterval = 30000, // 30 seconds
  className = ''
}) => {
  const [settings, setSettings] = useState<ProfileSettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<ProfileSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'overview' | 'theme' | 'widgets' | 'privacy'>('overview');
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize settings from initial data
  useEffect(() => {
    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      customization: {
        ...DEFAULT_SETTINGS.customization,
        profile: {
          ...DEFAULT_SETTINGS.customization.profile,
          name: initialData.name || DEFAULT_SETTINGS.customization.profile.name,
          description: initialData.description || DEFAULT_SETTINGS.customization.profile.description,
          specialization: initialData.specialization || DEFAULT_SETTINGS.customization.profile.specialization,
          welcomeMessage: initialData.welcomeMessage || DEFAULT_SETTINGS.customization.profile.welcomeMessage
        },
        theme: {
          ...DEFAULT_SETTINGS.customization.theme,
          ...initialData.theme
        },
        widgets: {
          enabled: initialData.widgets || [],
          layout: {},
          refreshIntervals: {}
        },
        privacy: {
          ...DEFAULT_SETTINGS.customization.privacy,
          ...initialData.visibility
        }
      }
    };

    setSettings(mergedSettings);
    setOriginalSettings(mergedSettings);
  }, [initialData]);

  // Validation functions
  const validateSettings = useCallback((settingsToValidate: ProfileSettings): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Validate profile
    const { profile } = settingsToValidate.customization;
    if (!profile.name || profile.name.length < VALIDATION_RULES.profile.name.minLength) {
      errors.push({
        field: 'profile.name',
        message: `Name must be at least ${VALIDATION_RULES.profile.name.minLength} characters`,
        severity: 'error'
      });
    }
    if (profile.name && profile.name.length > VALIDATION_RULES.profile.name.maxLength) {
      errors.push({
        field: 'profile.name',
        message: `Name must be less than ${VALIDATION_RULES.profile.name.maxLength} characters`,
        severity: 'error'
      });
    }

    // Validate theme colors
    const { primaryColor, accentColor } = settingsToValidate.theme;
    if (!VALIDATION_RULES.theme.primaryColor.pattern.test(primaryColor)) {
      errors.push({
        field: 'theme.primaryColor',
        message: 'Primary color must be a valid hex color',
        severity: 'error'
      });
    }
    if (!VALIDATION_RULES.theme.accentColor.pattern.test(accentColor)) {
      errors.push({
        field: 'theme.accentColor',
        message: 'Accent color must be a valid hex color',
        severity: 'error'
      });
    }

    // Validate widgets
    if (settingsToValidate.widgets.length > VALIDATION_RULES.widgets.maxCount) {
      errors.push({
        field: 'widgets',
        message: `Maximum ${VALIDATION_RULES.widgets.maxCount} widgets allowed`,
        severity: 'error'
      });
    }

    // Widget refresh interval validation
    settingsToValidate.widgets.forEach((widget, index) => {
      if (widget.refreshInterval > 0 && widget.refreshInterval < VALIDATION_RULES.widgets.minRefreshInterval) {
        errors.push({
          field: `widgets.${index}.refreshInterval`,
          message: `Refresh interval must be at least ${VALIDATION_RULES.widgets.minRefreshInterval} seconds`,
          severity: 'warning'
        });
      }
    });

    // Privacy validation
    if (settingsToValidate.privacy.dataRetentionDays < 1 && settingsToValidate.privacy.dataRetentionDays !== -1) {
      errors.push({
        field: 'privacy.dataRetentionDays',
        message: 'Data retention period must be at least 1 day or -1 for forever',
        severity: 'error'
      });
    }

    return errors;
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (!isAutoSaveEnabled || !hasUnsavedChanges || saveState.status === 'saving') {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      handleSave(true); // Auto-save
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [settings, hasUnsavedChanges, isAutoSaveEnabled, autoSaveInterval, saveState.status]);

  // Track changes
  useEffect(() => {
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasUnsavedChanges(hasChanges);
  }, [settings, originalSettings]);

  const handleSettingsChange = useCallback(<K extends keyof ProfileSettings>(
    section: K,
    updates: Partial<ProfileSettings[K]>
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates },
      metadata: {
        ...prev.metadata,
        lastModified: new Date().toISOString()
      }
    }));
  }, []);

  const handleSave = async (isAutoSave: boolean = false) => {
    if (saveState.status === 'saving') return;

    const errors = validateSettings(settings);
    setValidationErrors(errors);

    const hasErrors = errors.some(e => e.severity === 'error');
    if (hasErrors && !isAutoSave) {
      setShowValidationModal(true);
      return;
    }

    setSaveState({ status: 'saving' });

    try {
      await onSave?.(settings);
      setOriginalSettings(settings);
      setSaveState({ 
        status: 'success', 
        message: isAutoSave ? 'Auto-saved' : 'Settings saved successfully',
        lastSaved: new Date().toLocaleTimeString()
      });

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveState(prev => prev.status === 'success' ? { status: 'idle' } : prev);
      }, 3000);
    } catch (error) {
      setSaveState({ 
        status: 'error', 
        message: 'Failed to save settings',
        errors: [{ field: 'general', message: error instanceof Error ? error.message : 'Unknown error', severity: 'error' }]
      });
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onCancel?.();
    }
  };

  const handleReset = () => {
    const confirmReset = window.confirm('Are you sure you want to reset all settings to default values? This cannot be undone.');
    if (confirmReset) {
      setSettings(DEFAULT_SETTINGS);
    }
  };

  const handlePreview = () => {
    onPreview?.(settings);
  };

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `agent-${agentId}-profile-settings.json`;
    
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
        
        // Validate imported settings structure
        if (importedSettings.customization && importedSettings.theme && importedSettings.widgets && importedSettings.privacy) {
          setSettings({
            ...importedSettings,
            metadata: {
              ...importedSettings.metadata,
              lastModified: new Date().toISOString()
            }
          });
        } else {
          throw new Error('Invalid settings file format');
        }
      } catch (error) {
        alert('Invalid settings file format');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'overview': return Settings;
      case 'theme': return Palette;
      case 'widgets': return Layout;
      case 'privacy': return Shield;
      default: return Settings;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Profile Settings</h1>
                <p className="text-sm text-gray-500">Customize your agent profile and behavior</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Save Status */}
              {saveState.status === 'saving' && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Saving...</span>
                </div>
              )}
              {saveState.status === 'success' && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">{saveState.message}</span>
                  {saveState.lastSaved && (
                    <span className="text-xs text-gray-500">at {saveState.lastSaved}</span>
                  )}
                </div>
              )}
              {saveState.status === 'error' && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{saveState.message}</span>
                </div>
              )}

              {/* Unsaved Changes Indicator */}
              {hasUnsavedChanges && saveState.status !== 'saving' && (
                <Badge variant="secondary" className="text-xs">
                  Unsaved Changes
                </Badge>
              )}

              {/* Auto-save Toggle */}
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAutoSaveEnabled}
                    onChange={(e) => setIsAutoSaveEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-xs text-gray-600">Auto-save</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSettings}
                  className="hidden"
                  ref={fileInputRef}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </button>
                
                <button
                  onClick={handleExportSettings}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>

                <button
                  onClick={handleReset}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </button>

                {onPreview && (
                  <button
                    onClick={handlePreview}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </button>
                )}

                <button
                  onClick={() => handleSave(false)}
                  disabled={!hasUnsavedChanges || saveState.status === 'saving'}
                  className={cn(
                    'inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white',
                    hasUnsavedChanges && saveState.status !== 'saving'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  )}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Errors Banner */}
      {validationErrors.length > 0 && validationErrors.some(e => e.severity === 'error') && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
                <div className="mt-1 text-sm text-red-700">
                  {validationErrors.filter(e => e.severity === 'error').map((error, index) => (
                    <div key={index}>• {error.message}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            {['overview', 'theme', 'widgets', 'privacy'].map((tab) => {
              const IconComponent = getTabIcon(tab);
              return (
                <TabsTrigger 
                  key={tab}
                  value={tab} 
                  className="flex items-center gap-2 capitalize"
                >
                  <IconComponent className="w-4 h-4" />
                  {tab}
                  {tab === 'privacy' && !isPremium && (
                    <Badge variant="outline" className="text-xs ml-1">Premium</Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AgentCustomizationInterface
              agentId={agentId}
              initialData={initialData}
              onSave={async (customizationSettings) => {
                handleSettingsChange('customization', customizationSettings);
              }}
              onCancel={handleCancel}
            />
          </TabsContent>

          <TabsContent value="theme" className="space-y-6">
            <ThemeCustomizer
              settings={settings.theme}
              onChange={(themeUpdates) => handleSettingsChange('theme', themeUpdates)}
              onPreview={(themeSettings) => {
                const previewSettings = { ...settings, theme: themeSettings };
                onPreview?.(previewSettings);
              }}
            />
          </TabsContent>

          <TabsContent value="widgets" className="space-y-6">
            <WidgetConfiguration
              widgets={settings.widgets}
              onWidgetsChange={(widgets) => handleSettingsChange('widgets', widgets)}
              maxWidgets={maxWidgets}
            />
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <PrivacySettings
              settings={settings.privacy}
              onChange={(privacyUpdates) => handleSettingsChange('privacy', privacyUpdates)}
              onReset={() => handleSettingsChange('privacy', DEFAULT_SETTINGS.privacy)}
              onExport={handleExportSettings}
              isPremium={isPremium}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Unsaved Changes</h3>
                <p className="text-sm text-gray-600 mt-2">
                  You have unsaved changes that will be lost if you leave this page. What would you like to do?
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUnsavedWarning(false);
                  handleSave(false).then(() => onCancel?.());
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save & Exit
              </button>
              <button
                onClick={() => {
                  setShowUnsavedWarning(false);
                  onCancel?.();
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Discard Changes
              </button>
              <button
                onClick={() => setShowUnsavedWarning(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-start gap-3 mb-6">
                <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Validation Errors</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Please fix the following errors before saving:
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {validationErrors.map((error, index) => (
                  <div 
                    key={index}
                    className={cn(
                      'p-3 border rounded-lg',
                      error.severity === 'error' ? 'border-red-200 bg-red-50' :
                      error.severity === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                      'border-blue-200 bg-blue-50'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {error.severity === 'error' && <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />}
                      {error.severity === 'warning' && <Info className="w-4 h-4 text-yellow-600 mt-0.5" />}
                      {error.severity === 'info' && <Info className="w-4 h-4 text-blue-600 mt-0.5" />}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{error.field}</div>
                        <div className="text-sm text-gray-600">{error.message}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSettingsManager;