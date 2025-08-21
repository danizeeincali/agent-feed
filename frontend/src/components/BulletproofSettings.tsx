import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { 
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Key,
  Monitor,
  Wifi,
  Download,
  Upload,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Plus,
  X,
  Loader2,
  Zap,
  Clock,
  HardDrive,
  Cpu
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { ErrorBoundary } from 'react-error-boundary';
import {
  safeArray,
  safeObject,
  safeString,
  safeNumber,
  safeDate,
  ErrorFallback,
  LoadingFallback,
  withSafetyWrapper,
  safeHandler
} from '@/utils/safetyUtils';

interface UserSettings {
  profile: {
    username: string;
    email: string;
    display_name: string;
    avatar_url?: string;
    timezone: string;
    language: string;
  };
  notifications: {
    email_enabled: boolean;
    push_enabled: boolean;
    agent_activity: boolean;
    task_completion: boolean;
    error_alerts: boolean;
    system_updates: boolean;
    digest_frequency: 'never' | 'daily' | 'weekly' | 'monthly';
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    compact_mode: boolean;
    animations_enabled: boolean;
    font_size: 'small' | 'medium' | 'large';
    sidebar_collapsed: boolean;
  };
  privacy: {
    data_collection: boolean;
    analytics: boolean;
    error_reporting: boolean;
    usage_statistics: boolean;
    third_party_integrations: boolean;
  };
  system: {
    auto_refresh: boolean;
    refresh_interval: number;
    max_concurrent_agents: number;
    default_timeout: number;
    log_level: 'error' | 'warn' | 'info' | 'debug';
    cache_enabled: boolean;
  };
  security: {
    two_factor_enabled: boolean;
    session_timeout: number;
    api_key_rotation: boolean;
    audit_logging: boolean;
    ip_whitelist: string[];
  };
}

interface SettingsProps {
  className?: string;
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
  retryable?: boolean;
}

// Safe settings transformer
const transformToSafeSettings = (settings: any): UserSettings => {
  try {
    return {
      profile: {
        username: safeString(settings?.profile?.username, 'user'),
        email: safeString(settings?.profile?.email, 'user@example.com'),
        display_name: safeString(settings?.profile?.display_name, 'User'),
        avatar_url: settings?.profile?.avatar_url ? safeString(settings.profile.avatar_url) : undefined,
        timezone: safeString(settings?.profile?.timezone, 'UTC'),
        language: safeString(settings?.profile?.language, 'en')
      },
      notifications: {
        email_enabled: Boolean(settings?.notifications?.email_enabled ?? true),
        push_enabled: Boolean(settings?.notifications?.push_enabled ?? true),
        agent_activity: Boolean(settings?.notifications?.agent_activity ?? true),
        task_completion: Boolean(settings?.notifications?.task_completion ?? true),
        error_alerts: Boolean(settings?.notifications?.error_alerts ?? true),
        system_updates: Boolean(settings?.notifications?.system_updates ?? false),
        digest_frequency: ['never', 'daily', 'weekly', 'monthly'].includes(settings?.notifications?.digest_frequency)
          ? settings.notifications.digest_frequency
          : 'weekly'
      },
      appearance: {
        theme: ['light', 'dark', 'system'].includes(settings?.appearance?.theme)
          ? settings.appearance.theme
          : 'system',
        compact_mode: Boolean(settings?.appearance?.compact_mode ?? false),
        animations_enabled: Boolean(settings?.appearance?.animations_enabled ?? true),
        font_size: ['small', 'medium', 'large'].includes(settings?.appearance?.font_size)
          ? settings.appearance.font_size
          : 'medium',
        sidebar_collapsed: Boolean(settings?.appearance?.sidebar_collapsed ?? false)
      },
      privacy: {
        data_collection: Boolean(settings?.privacy?.data_collection ?? true),
        analytics: Boolean(settings?.privacy?.analytics ?? true),
        error_reporting: Boolean(settings?.privacy?.error_reporting ?? true),
        usage_statistics: Boolean(settings?.privacy?.usage_statistics ?? true),
        third_party_integrations: Boolean(settings?.privacy?.third_party_integrations ?? false)
      },
      system: {
        auto_refresh: Boolean(settings?.system?.auto_refresh ?? true),
        refresh_interval: Math.min(300, Math.max(5, safeNumber(settings?.system?.refresh_interval, 30))),
        max_concurrent_agents: Math.min(50, Math.max(1, safeNumber(settings?.system?.max_concurrent_agents, 10))),
        default_timeout: Math.min(300, Math.max(5, safeNumber(settings?.system?.default_timeout, 30))),
        log_level: ['error', 'warn', 'info', 'debug'].includes(settings?.system?.log_level)
          ? settings.system.log_level
          : 'info',
        cache_enabled: Boolean(settings?.system?.cache_enabled ?? true)
      },
      security: {
        two_factor_enabled: Boolean(settings?.security?.two_factor_enabled ?? false),
        session_timeout: Math.min(86400, Math.max(300, safeNumber(settings?.security?.session_timeout, 3600))),
        api_key_rotation: Boolean(settings?.security?.api_key_rotation ?? false),
        audit_logging: Boolean(settings?.security?.audit_logging ?? true),
        ip_whitelist: safeArray(settings?.security?.ip_whitelist).filter(ip => typeof ip === 'string')
      }
    };
  } catch (error) {
    console.error('Failed to transform settings:', error);
    // Return safe defaults
    return {
      profile: {
        username: 'user',
        email: 'user@example.com',
        display_name: 'User',
        timezone: 'UTC',
        language: 'en'
      },
      notifications: {
        email_enabled: true,
        push_enabled: true,
        agent_activity: true,
        task_completion: true,
        error_alerts: true,
        system_updates: false,
        digest_frequency: 'weekly'
      },
      appearance: {
        theme: 'system',
        compact_mode: false,
        animations_enabled: true,
        font_size: 'medium',
        sidebar_collapsed: false
      },
      privacy: {
        data_collection: true,
        analytics: true,
        error_reporting: true,
        usage_statistics: true,
        third_party_integrations: false
      },
      system: {
        auto_refresh: true,
        refresh_interval: 30,
        max_concurrent_agents: 10,
        default_timeout: 30,
        log_level: 'info',
        cache_enabled: true
      },
      security: {
        two_factor_enabled: false,
        session_timeout: 3600,
        api_key_rotation: false,
        audit_logging: true,
        ip_whitelist: []
      }
    };
  }
};

// Loading skeleton
const SettingsSkeleton: React.FC = memo(() => (
  <div className="animate-pulse space-y-6">
    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
      ))}
    </div>
  </div>
));

SettingsSkeleton.displayName = 'SettingsSkeleton';

const BulletproofSettings: React.FC<SettingsProps> = memo(({ 
  className = '',
  onError,
  fallback,
  retryable = true
}) => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'appearance' | 'privacy' | 'system' | 'security'>('profile');
  const [hasChanges, setHasChanges] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showApiKey, setShowApiKey] = useState(false);
  const [newIpAddress, setNewIpAddress] = useState('');

  // Safe error handler
  const handleError = useCallback((err: Error, context?: string) => {
    console.error(`Settings Error${context ? ` (${context})` : ''}:`, err);
    setError(err.message || 'An unexpected error occurred');
    onError?.(err);
  }, [onError]);

  // Safe data fetching
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      clearTimeout(timeoutId);
      
      // In a real app:
      // const response = await fetch('/api/v1/user/settings', { signal: controller.signal });
      // if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // const data = await response.json();
      
      // Mock settings data
      const mockSettings = {
        profile: {
          username: 'claude_user',
          email: 'user@example.com',
          display_name: 'Claude User',
          timezone: 'America/New_York',
          language: 'en'
        },
        notifications: {
          email_enabled: true,
          push_enabled: true,
          agent_activity: true,
          task_completion: true,
          error_alerts: true,
          system_updates: false,
          digest_frequency: 'weekly'
        },
        appearance: {
          theme: 'system',
          compact_mode: false,
          animations_enabled: true,
          font_size: 'medium',
          sidebar_collapsed: false
        },
        privacy: {
          data_collection: true,
          analytics: true,
          error_reporting: true,
          usage_statistics: true,
          third_party_integrations: false
        },
        system: {
          auto_refresh: true,
          refresh_interval: 30,
          max_concurrent_agents: 10,
          default_timeout: 30,
          log_level: 'info',
          cache_enabled: true
        },
        security: {
          two_factor_enabled: false,
          session_timeout: 3600,
          api_key_rotation: false,
          audit_logging: true,
          ip_whitelist: ['192.168.1.0/24']
        }
      };
      
      const safeSettings = transformToSafeSettings(mockSettings);
      setSettings(safeSettings);
      setRetryCount(0);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          handleError(new Error('Request timeout - please try again'), 'load');
        } else {
          handleError(err, 'load');
        }
      } else {
        handleError(new Error('Unknown error occurred'), 'load');
      }
      
      // Set fallback settings on error
      if (!settings) {
        setSettings(transformToSafeSettings({}));
      }
    } finally {
      setLoading(false);
    }
  }, [handleError, settings]);

  // Initialize component
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Safe save handler
  const handleSaveSettings = useCallback(async () => {
    try {
      if (!settings || !hasChanges) return;
      
      setSaving(true);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearTimeout(timeoutId);
      
      // In a real app:
      // const response = await fetch('/api/v1/user/settings', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings),
      //   signal: controller.signal
      // });
      
      setHasChanges(false);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to save settings'), 'save');
    } finally {
      setSaving(false);
    }
  }, [settings, hasChanges, handleError]);

  // Safe setting update handler
  const updateSetting = useCallback(<K extends keyof UserSettings, T extends keyof UserSettings[K]>(
    section: K,
    key: T,
    value: UserSettings[K][T]
  ) => {
    try {
      if (!settings) return;
      
      setSettings(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [key]: value
          }
        };
      });
      
      setHasChanges(true);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to update setting'), 'update');
    }
  }, [settings, handleError]);

  // Safe IP address management
  const addIpAddress = useCallback(() => {
    try {
      const ip = safeString(newIpAddress).trim();
      if (!ip) return;
      
      // Basic IP validation
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:3[0-2]|[12]?[0-9]))?$/;
      if (!ipRegex.test(ip)) {
        throw new Error('Invalid IP address format');
      }
      
      if (settings) {
        const currentList = safeArray(settings.security.ip_whitelist);
        if (!currentList.includes(ip)) {
          updateSetting('security', 'ip_whitelist', [...currentList, ip]);
          setNewIpAddress('');
        }
      }
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to add IP address'), 'ip-add');
    }
  }, [newIpAddress, settings, updateSetting, handleError]);

  const removeIpAddress = useCallback((ip: string) => {
    try {
      if (settings) {
        const currentList = safeArray(settings.security.ip_whitelist);
        updateSetting('security', 'ip_whitelist', currentList.filter(addr => addr !== ip));
      }
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to remove IP address'), 'ip-remove');
    }
  }, [settings, updateSetting, handleError]);

  // Safe utility functions
  const generateApiKey = useCallback(() => {
    try {
      const length = 32;
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = 'ak_';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    } catch (error) {
      console.error('Failed to generate API key:', error);
      return 'ak_' + Date.now().toString(36);
    }
  }, []);

  const exportSettings = useCallback(() => {
    try {
      if (!settings) return;
      
      const dataStr = JSON.stringify(settings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `claude-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to export settings'), 'export');
    }
  }, [settings, handleError]);

  const importSettings = useCallback((file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = safeString(e.target?.result as string);
          const importedSettings = JSON.parse(content);
          const safeSettings = transformToSafeSettings(importedSettings);
          setSettings(safeSettings);
          setHasChanges(true);
        } catch (error) {
          handleError(new Error('Invalid settings file format'), 'import-parse');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to import settings'), 'import');
    }
  }, [handleError]);

  // Safe handlers
  const handleRefresh = useCallback(() => {
    setRetryCount(prev => prev + 1);
    loadSettings();
  }, [loadSettings]);

  // Get section icon
  const getSectionIcon = useCallback((section: string) => {
    const iconMap = {
      profile: User,
      notifications: Bell,
      appearance: Palette,
      privacy: Shield,
      system: Database,
      security: Key
    };
    return iconMap[section as keyof typeof iconMap] || Settings;
  }, []);

  // Loading state
  if (loading && !settings) {
    return (
      <div className={`p-6 ${className}`}>
        <SettingsSkeleton />
      </div>
    );
  }

  // Error state
  if (error && !settings) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <Settings className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Settings</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          {retryable && (
            <div className="space-y-2">
              <button 
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                    Retrying...
                  </>
                ) : (
                  'Try again'
                )}
              </button>
              {retryCount > 0 && (
                <p className="text-xs text-gray-500">
                  Retry attempt: {retryCount}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <ErrorFallback 
          error={error} 
          resetErrorBoundary={resetErrorBoundary} 
          componentName="Settings" 
        />
      )}
    >
      <div className={`p-6 space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your Claude Code preferences and configuration</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={exportSettings}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            
            <label className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importSettings(file);
                }}
                className="hidden"
              />
            </label>
            
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            {hasChanges && (
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Changes notification */}
        {hasChanges && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Info className="w-5 h-5 text-blue-600 mr-2" />
              <p className="text-blue-800 text-sm">
                You have unsaved changes. Click "Save Changes" to apply them.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {[
                { id: 'profile', name: 'Profile', icon: User },
                { id: 'notifications', name: 'Notifications', icon: Bell },
                { id: 'appearance', name: 'Appearance', icon: Palette },
                { id: 'privacy', name: 'Privacy', icon: Shield },
                { id: 'system', name: 'System', icon: Database },
                { id: 'security', name: 'Security', icon: Key }
              ].map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id as any)}
                    className={cn(
                      'w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      activeSection === section.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    )}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {section.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {/* Profile Settings */}
              {activeSection === 'profile' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Profile Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={settings.profile.username}
                        onChange={(e) => updateSetting('profile', 'username', safeString(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={settings.profile.display_name}
                        onChange={(e) => updateSetting('profile', 'display_name', safeString(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={settings.profile.email}
                        onChange={(e) => updateSetting('profile', 'email', safeString(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        value={settings.profile.timezone}
                        onChange={(e) => updateSetting('profile', 'timezone', safeString(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Paris">Paris</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        value={settings.profile.language}
                        onChange={(e) => updateSetting('profile', 'language', safeString(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="ja">Japanese</option>
                        <option value="zh">Chinese</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Settings */}
              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                        <p className="text-sm text-gray-500">Receive notifications via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.email_enabled}
                          onChange={(e) => updateSetting('notifications', 'email_enabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
                        <p className="text-sm text-gray-500">Receive browser push notifications</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.push_enabled}
                          onChange={(e) => updateSetting('notifications', 'push_enabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Agent Activity</h4>
                        <p className="text-sm text-gray-500">Notifications when agents start or complete tasks</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.agent_activity}
                          onChange={(e) => updateSetting('notifications', 'agent_activity', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Error Alerts</h4>
                        <p className="text-sm text-gray-500">Immediate notifications for system errors</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.error_alerts}
                          onChange={(e) => updateSetting('notifications', 'error_alerts', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Digest Frequency
                      </label>
                      <select
                        value={settings.notifications.digest_frequency}
                        onChange={(e) => updateSetting('notifications', 'digest_frequency', e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="never">Never</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance Settings */}
              {activeSection === 'appearance' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Appearance Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Theme
                      </label>
                      <select
                        value={settings.appearance.theme}
                        onChange={(e) => updateSetting('appearance', 'theme', e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Font Size
                      </label>
                      <select
                        value={settings.appearance.font_size}
                        onChange={(e) => updateSetting('appearance', 'font_size', e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Compact Mode</h4>
                        <p className="text-sm text-gray-500">Reduce spacing and padding</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.appearance.compact_mode}
                          onChange={(e) => updateSetting('appearance', 'compact_mode', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Animations</h4>
                        <p className="text-sm text-gray-500">Enable smooth transitions and animations</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.appearance.animations_enabled}
                          onChange={(e) => updateSetting('appearance', 'animations_enabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy Settings */}
              {activeSection === 'privacy' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Privacy Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Data Collection</h4>
                        <p className="text-sm text-gray-500">Allow collection of usage data to improve the service</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.privacy.data_collection}
                          onChange={(e) => updateSetting('privacy', 'data_collection', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Analytics</h4>
                        <p className="text-sm text-gray-500">Allow anonymous analytics tracking</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.privacy.analytics}
                          onChange={(e) => updateSetting('privacy', 'analytics', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Error Reporting</h4>
                        <p className="text-sm text-gray-500">Automatically send error reports to help fix issues</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.privacy.error_reporting}
                          onChange={(e) => updateSetting('privacy', 'error_reporting', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* System Settings */}
              {activeSection === 'system' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">System Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Auto Refresh</h4>
                        <p className="text-sm text-gray-500">Automatically refresh data periodically</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.system.auto_refresh}
                          onChange={(e) => updateSetting('system', 'auto_refresh', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Refresh Interval (seconds)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="300"
                        value={settings.system.refresh_interval}
                        onChange={(e) => updateSetting('system', 'refresh_interval', safeNumber(parseInt(e.target.value), 30))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Concurrent Agents
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={settings.system.max_concurrent_agents}
                        onChange={(e) => updateSetting('system', 'max_concurrent_agents', safeNumber(parseInt(e.target.value), 10))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="300"
                        value={settings.system.default_timeout}
                        onChange={(e) => updateSetting('system', 'default_timeout', safeNumber(parseInt(e.target.value), 30))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Log Level
                      </label>
                      <select
                        value={settings.system.log_level}
                        onChange={(e) => updateSetting('system', 'log_level', e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="error">Error</option>
                        <option value="warn">Warning</option>
                        <option value="info">Info</option>
                        <option value="debug">Debug</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeSection === 'security' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.security.two_factor_enabled}
                          onChange={(e) => updateSetting('security', 'two_factor_enabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Session Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        min="300"
                        max="86400"
                        value={settings.security.session_timeout}
                        onChange={(e) => updateSetting('security', 'session_timeout', safeNumber(parseInt(e.target.value), 3600))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">API Key Rotation</h4>
                        <p className="text-sm text-gray-500">Automatically rotate API keys periodically</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.security.api_key_rotation}
                          onChange={(e) => updateSetting('security', 'api_key_rotation', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={generateApiKey()}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(generateApiKey())}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        IP Whitelist
                      </label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="192.168.1.0/24"
                            value={newIpAddress}
                            onChange={(e) => setNewIpAddress(safeString(e.target.value))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            onClick={addIpAddress}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="space-y-1">
                          {safeArray(settings.security.ip_whitelist).map((ip, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="font-mono text-sm">{ip}</span>
                              <button
                                onClick={() => removeIpAddress(ip)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
});

BulletproofSettings.displayName = 'BulletproofSettings';

// Export with safety wrapper
export default withSafetyWrapper(BulletproofSettings, 'BulletproofSettings');
export { BulletproofSettings };