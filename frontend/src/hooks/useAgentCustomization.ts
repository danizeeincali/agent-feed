import { useState, useCallback, useEffect } from 'react';
import { CustomizationSettings } from '@/components/agent-customization/AgentCustomizationInterface';
import { ThemeSettings } from '@/components/agent-customization/ThemeCustomizer';
import { WidgetConfig } from '@/components/agent-customization/WidgetConfiguration';
import { PrivacySettings } from '@/components/agent-customization/PrivacySettings';
import { ProfileSettings } from '@/components/agent-customization/ProfileSettingsManager';

interface UseAgentCustomizationOptions {
  agentId: string;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

interface SaveState {
  status: 'idle' | 'saving' | 'success' | 'error';
  message?: string;
  lastSaved?: string;
}

export const useAgentCustomization = (options: UseAgentCustomizationOptions) => {
  const { agentId, autoSave = false, autoSaveInterval = 30000 } = options;
  
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Check for unsaved changes
  useEffect(() => {
    if (!settings || !originalSettings) return;
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasUnsavedChanges(hasChanges);
  }, [settings, originalSettings]);

  // Load settings from backend or localStorage
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      // Try to load from backend API first
      const response = await fetch(`/api/agents/${agentId}/settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setOriginalSettings(data);
      } else {
        // Fallback to localStorage
        const localSettings = localStorage.getItem(`agent-settings-${agentId}`);
        if (localSettings) {
          const parsedSettings = JSON.parse(localSettings);
          setSettings(parsedSettings);
          setOriginalSettings(parsedSettings);
        } else {
          // Use default settings if nothing found
          const defaultSettings = createDefaultSettings(agentId);
          setSettings(defaultSettings);
          setOriginalSettings(defaultSettings);
        }
      }
    } catch (error) {
      console.error('Failed to load agent settings:', error);
      // Fallback to localStorage on error
      const localSettings = localStorage.getItem(`agent-settings-${agentId}`);
      if (localSettings) {
        const parsedSettings = JSON.parse(localSettings);
        setSettings(parsedSettings);
        setOriginalSettings(parsedSettings);
      } else {
        const defaultSettings = createDefaultSettings(agentId);
        setSettings(defaultSettings);
        setOriginalSettings(defaultSettings);
      }
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Save settings to backend and localStorage
  const saveSettings = useCallback(async (settingsToSave?: ProfileSettings, isAutoSave = false) => {
    const targetSettings = settingsToSave || settings;
    if (!targetSettings) return false;

    setSaveState({ status: 'saving' });

    try {
      // Try to save to backend API
      const response = await fetch(`/api/agents/${agentId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(targetSettings),
      });

      if (response.ok) {
        // Update local state on successful save
        setOriginalSettings(targetSettings);
        setSaveState({
          status: 'success',
          message: isAutoSave ? 'Auto-saved' : 'Settings saved successfully',
          lastSaved: new Date().toLocaleTimeString()
        });
        
        // Also save to localStorage as backup
        localStorage.setItem(`agent-settings-${agentId}`, JSON.stringify(targetSettings));
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSaveState(prev => prev.status === 'success' ? { status: 'idle' } : prev);
        }, 3000);

        return true;
      } else {
        throw new Error(`Save failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to save to backend, falling back to localStorage:', error);
      
      // Fallback to localStorage
      try {
        localStorage.setItem(`agent-settings-${agentId}`, JSON.stringify(targetSettings));
        setOriginalSettings(targetSettings);
        setSaveState({
          status: 'success',
          message: isAutoSave ? 'Auto-saved (offline)' : 'Settings saved locally',
          lastSaved: new Date().toLocaleTimeString()
        });
        
        setTimeout(() => {
          setSaveState(prev => prev.status === 'success' ? { status: 'idle' } : prev);
        }, 3000);

        return true;
      } catch (localError) {
        setSaveState({
          status: 'error',
          message: 'Failed to save settings'
        });
        return false;
      }
    }
  }, [agentId, settings]);

  // Update specific settings section
  const updateSettings = useCallback(<K extends keyof ProfileSettings>(
    section: K,
    updates: Partial<ProfileSettings[K]>
  ) => {
    if (!settings) return;

    const updatedSettings = {
      ...settings,
      [section]: { ...settings[section], ...updates },
      metadata: {
        ...settings.metadata,
        lastModified: new Date().toISOString()
      }
    };

    setSettings(updatedSettings);
  }, [settings]);

  // Reset settings to original state
  const resetSettings = useCallback(() => {
    if (originalSettings) {
      setSettings({ ...originalSettings });
    }
  }, [originalSettings]);

  // Reset to default settings
  const resetToDefaults = useCallback(() => {
    const defaultSettings = createDefaultSettings(agentId);
    setSettings(defaultSettings);
  }, [agentId]);

  // Export settings
  const exportSettings = useCallback(() => {
    if (!settings) return;

    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `agent-${agentId}-settings-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [agentId, settings]);

  // Import settings
  const importSettings = useCallback((importedSettings: ProfileSettings) => {
    // Validate imported settings structure
    if (!isValidSettingsStructure(importedSettings)) {
      throw new Error('Invalid settings file format');
    }

    const updatedSettings = {
      ...importedSettings,
      metadata: {
        ...importedSettings.metadata,
        lastModified: new Date().toISOString()
      }
    };

    setSettings(updatedSettings);
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !hasUnsavedChanges || saveState.status === 'saving' || !settings) {
      return;
    }

    const autoSaveTimeout = setTimeout(() => {
      saveSettings(settings, true);
    }, autoSaveInterval);

    return () => clearTimeout(autoSaveTimeout);
  }, [autoSave, hasUnsavedChanges, saveState.status, settings, saveSettings, autoSaveInterval]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    // State
    settings,
    loading,
    saveState,
    hasUnsavedChanges,

    // Actions
    updateSettings,
    saveSettings,
    resetSettings,
    resetToDefaults,
    exportSettings,
    importSettings,
    loadSettings,

    // Convenience methods
    updateCustomization: (updates: Partial<CustomizationSettings>) => 
      updateSettings('customization', updates),
    updateTheme: (updates: Partial<ThemeSettings>) => 
      updateSettings('theme', updates),
    updateWidgets: (widgets: WidgetConfig[]) => 
      updateSettings('widgets', widgets),
    updatePrivacy: (updates: Partial<PrivacySettings>) => 
      updateSettings('privacy', updates),
  };
};

// Helper function to create default settings
function createDefaultSettings(agentId: string): ProfileSettings {
  return {
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
      createdBy: agentId,
      tags: []
    }
  };
}

// Helper function to validate settings structure
function isValidSettingsStructure(settings: any): settings is ProfileSettings {
  return (
    settings &&
    typeof settings === 'object' &&
    settings.customization &&
    settings.theme &&
    settings.widgets &&
    Array.isArray(settings.widgets) &&
    settings.privacy &&
    settings.metadata
  );
}

export default useAgentCustomization;