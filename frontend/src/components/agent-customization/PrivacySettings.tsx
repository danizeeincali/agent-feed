import React, { useState, useCallback } from 'react';
import { 
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  Globe,
  Users,
  User,
  MessageCircle,
  BarChart3,
  Activity,
  Download,
  Upload,
  Settings,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Database,
  Share2,
  FileText,
  Key,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';

export interface PrivacySettings {
  // Profile Visibility
  profileVisibility: 'public' | 'private' | 'restricted';
  allowDirectContact: boolean;
  showLastActive: boolean;
  showOnlineStatus: boolean;
  
  // Content Privacy
  allowComments: boolean;
  moderateComments: boolean;
  allowSharing: boolean;
  allowEmbedding: boolean;
  
  // Metrics & Analytics
  showPerformanceMetrics: boolean;
  showActivityFeed: boolean;
  showCapabilities: boolean;
  shareAnalytics: boolean;
  
  // Data Management
  allowDataExport: boolean;
  dataRetentionDays: number;
  anonymizeOldData: boolean;
  allowDataDeletion: boolean;
  
  // API & Integration
  enableAPIAccess: boolean;
  allowThirdPartyIntegrations: boolean;
  shareUsageStats: boolean;
  
  // Notifications
  notifyOnProfileView: boolean;
  notifyOnMentions: boolean;
  notifyOnComments: boolean;
  notifyOnDataExport: boolean;
  
  // Advanced Settings
  requireAuthentication: boolean;
  enableTwoFactor: boolean;
  logAccessAttempts: boolean;
  sessionTimeout: number; // in minutes
  
  // Compliance
  gdprCompliant: boolean;
  ccpaCompliant: boolean;
  dataProcessingConsent: boolean;
  marketingConsent: boolean;
}

interface PrivacyGroup {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  settings: Array<{
    key: keyof PrivacySettings;
    label: string;
    description: string;
    type: 'boolean' | 'select' | 'number';
    options?: Array<{ value: any; label: string; description?: string }>;
    warning?: string;
    premium?: boolean;
  }>;
}

interface PrivacySettingsProps {
  settings: PrivacySettings;
  onChange: (settings: Partial<PrivacySettings>) => void;
  onReset?: () => void;
  onExport?: () => void;
  onImport?: (settings: PrivacySettings) => void;
  isPremium?: boolean;
  className?: string;
}

const PRIVACY_GROUPS: PrivacyGroup[] = [
  {
    id: 'profile',
    title: 'Profile Visibility',
    description: 'Control who can view your agent profile and basic information',
    icon: Eye,
    settings: [
      {
        key: 'profileVisibility',
        label: 'Profile Visibility',
        description: 'Who can view your agent profile',
        type: 'select',
        options: [
          { value: 'public', label: 'Public', description: 'Anyone can view your profile' },
          { value: 'restricted', label: 'Restricted', description: 'Only authenticated users can view' },
          { value: 'private', label: 'Private', description: 'Only you can view your profile' }
        ]
      },
      {
        key: 'allowDirectContact',
        label: 'Allow Direct Contact',
        description: 'Allow users to contact you directly through your profile',
        type: 'boolean'
      },
      {
        key: 'showLastActive',
        label: 'Show Last Active',
        description: 'Display when you were last active',
        type: 'boolean'
      },
      {
        key: 'showOnlineStatus',
        label: 'Show Online Status',
        description: 'Display whether you are currently online',
        type: 'boolean'
      }
    ]
  },
  {
    id: 'content',
    title: 'Content & Interaction',
    description: 'Manage how others can interact with your content and posts',
    icon: MessageCircle,
    settings: [
      {
        key: 'allowComments',
        label: 'Allow Comments',
        description: 'Let users comment on your posts and updates',
        type: 'boolean'
      },
      {
        key: 'moderateComments',
        label: 'Moderate Comments',
        description: 'Review comments before they appear publicly',
        type: 'boolean'
      },
      {
        key: 'allowSharing',
        label: 'Allow Sharing',
        description: 'Allow users to share your content on other platforms',
        type: 'boolean'
      },
      {
        key: 'allowEmbedding',
        label: 'Allow Embedding',
        description: 'Allow your content to be embedded on external sites',
        type: 'boolean',
        premium: true
      }
    ]
  },
  {
    id: 'analytics',
    title: 'Metrics & Analytics',
    description: 'Control what performance data is visible to others',
    icon: BarChart3,
    settings: [
      {
        key: 'showPerformanceMetrics',
        label: 'Show Performance Metrics',
        description: 'Display task success rates, response times, etc.',
        type: 'boolean'
      },
      {
        key: 'showActivityFeed',
        label: 'Show Activity Feed',
        description: 'Display recent tasks and activities',
        type: 'boolean'
      },
      {
        key: 'showCapabilities',
        label: 'Show Capabilities',
        description: 'Display your skills and expertise areas',
        type: 'boolean'
      },
      {
        key: 'shareAnalytics',
        label: 'Share Analytics',
        description: 'Allow aggregated analytics to be shared with researchers',
        type: 'boolean',
        premium: true
      }
    ]
  },
  {
    id: 'data',
    title: 'Data Management',
    description: 'Control how your data is stored, shared, and managed',
    icon: Database,
    settings: [
      {
        key: 'allowDataExport',
        label: 'Allow Data Export',
        description: 'Let users export their interaction data with you',
        type: 'boolean'
      },
      {
        key: 'dataRetentionDays',
        label: 'Data Retention Period',
        description: 'How long to keep interaction data (days)',
        type: 'number',
        options: [
          { value: 30, label: '30 days' },
          { value: 90, label: '90 days' },
          { value: 180, label: '6 months' },
          { value: 365, label: '1 year' },
          { value: -1, label: 'Forever' }
        ]
      },
      {
        key: 'anonymizeOldData',
        label: 'Anonymize Old Data',
        description: 'Remove personal identifiers from data older than retention period',
        type: 'boolean'
      },
      {
        key: 'allowDataDeletion',
        label: 'Allow Data Deletion',
        description: 'Allow users to request deletion of their data',
        type: 'boolean'
      }
    ]
  },
  {
    id: 'integrations',
    title: 'API & Integrations',
    description: 'Manage third-party access and integrations',
    icon: Share2,
    settings: [
      {
        key: 'enableAPIAccess',
        label: 'Enable API Access',
        description: 'Allow programmatic access to your agent via API',
        type: 'boolean',
        premium: true
      },
      {
        key: 'allowThirdPartyIntegrations',
        label: 'Third-party Integrations',
        description: 'Allow connections with external services',
        type: 'boolean',
        premium: true
      },
      {
        key: 'shareUsageStats',
        label: 'Share Usage Statistics',
        description: 'Share anonymized usage patterns for platform improvement',
        type: 'boolean'
      }
    ]
  },
  {
    id: 'security',
    title: 'Security & Authentication',
    description: 'Advanced security settings for your agent profile',
    icon: Shield,
    settings: [
      {
        key: 'requireAuthentication',
        label: 'Require Authentication',
        description: 'Require users to be logged in to interact with your agent',
        type: 'boolean'
      },
      {
        key: 'enableTwoFactor',
        label: 'Two-Factor Authentication',
        description: 'Enable 2FA for admin access to your agent settings',
        type: 'boolean',
        premium: true
      },
      {
        key: 'logAccessAttempts',
        label: 'Log Access Attempts',
        description: 'Keep logs of all access attempts to your agent',
        type: 'boolean'
      },
      {
        key: 'sessionTimeout',
        label: 'Session Timeout',
        description: 'Automatically log out users after inactivity (minutes)',
        type: 'select',
        options: [
          { value: 15, label: '15 minutes' },
          { value: 30, label: '30 minutes' },
          { value: 60, label: '1 hour' },
          { value: 240, label: '4 hours' },
          { value: -1, label: 'Never' }
        ]
      }
    ]
  }
];

const DATA_COMPLIANCE_SETTINGS = [
  {
    key: 'gdprCompliant' as keyof PrivacySettings,
    label: 'GDPR Compliance',
    description: 'Comply with General Data Protection Regulation',
    required: true
  },
  {
    key: 'ccpaCompliant' as keyof PrivacySettings,
    label: 'CCPA Compliance',
    description: 'Comply with California Consumer Privacy Act',
    required: false
  },
  {
    key: 'dataProcessingConsent' as keyof PrivacySettings,
    label: 'Data Processing Consent',
    description: 'User consent for processing personal data',
    required: true
  },
  {
    key: 'marketingConsent' as keyof PrivacySettings,
    label: 'Marketing Communications',
    description: 'User consent for marketing communications',
    required: false
  }
];

const PrivacySettings: React.FC<PrivacySettingsProps> = ({
  settings,
  onChange,
  onReset,
  onExport,
  onImport,
  isPremium = false,
  className = ''
}) => {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['profile']);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [showWarnings, setShowWarnings] = useState(true);

  const handleSettingChange = useCallback((key: keyof PrivacySettings, value: any) => {
    onChange({ [key]: value });
  }, [onChange]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  }, []);

  const getPrivacyScore = useCallback(() => {
    let score = 0;
    const maxScore = 10;

    if (!settings.profileVisibility || settings.profileVisibility === 'public') score += 1;
    if (!settings.allowDirectContact) score += 1;
    if (!settings.showLastActive) score += 1;
    if (!settings.showOnlineStatus) score += 1;
    if (settings.moderateComments) score += 1;
    if (!settings.allowSharing) score += 1;
    if (!settings.showPerformanceMetrics) score += 1;
    if (settings.requireAuthentication) score += 1;
    if (settings.enableTwoFactor) score += 1;
    if (settings.logAccessAttempts) score += 1;

    return (score / maxScore) * 100;
  }, [settings]);

  const renderSetting = (setting: PrivacyGroup['settings'][0], groupId: string) => {
    const isDisabled = setting.premium && !isPremium;
    const currentValue = settings[setting.key];

    return (
      <div key={setting.key} className={cn(
        'flex items-start justify-between p-4 border border-gray-100 rounded-lg',
        isDisabled && 'opacity-60 bg-gray-50'
      )}>
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-900">{setting.label}</label>
            {setting.premium && (
              <Badge variant="outline" className="text-xs">Premium</Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">{setting.description}</p>
          
          {setting.warning && showWarnings && (
            <div className="flex items-start gap-2 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{setting.warning}</span>
            </div>
          )}
        </div>

        <div className="flex-shrink-0">
          {setting.type === 'boolean' && (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={currentValue as boolean}
                onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
                disabled={isDisabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          )}

          {setting.type === 'select' && (
            <select
              value={currentValue as string | number}
              onChange={(e) => handleSettingChange(setting.key, 
                setting.key === 'dataRetentionDays' || setting.key === 'sessionTimeout' 
                  ? parseInt(e.target.value) 
                  : e.target.value
              )}
              disabled={isDisabled}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {setting.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          {setting.type === 'number' && (
            <input
              type="number"
              value={currentValue as number}
              onChange={(e) => handleSettingChange(setting.key, parseInt(e.target.value))}
              disabled={isDisabled}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          )}
        </div>
      </div>
    );
  };

  const privacyScore = getPrivacyScore();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Privacy Score */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy Settings</h3>
            <p className="text-sm text-gray-600">Control how your agent profile and data are shared and accessed</p>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 mb-1">{Math.round(privacyScore)}%</div>
            <div className="text-xs text-gray-500 mb-2">Privacy Score</div>
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  privacyScore >= 80 ? 'bg-green-500' :
                  privacyScore >= 60 ? 'bg-yellow-500' :
                  'bg-red-500'
                )}
                style={{ width: `${privacyScore}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3 mt-6">
          {onReset && (
            <button
              onClick={onReset}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </button>
          )}

          {onExport && (
            <button
              onClick={onExport}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Settings
            </button>
          )}

          <button
            onClick={() => setShowComplianceModal(true)}
            className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Compliance Settings
          </button>

          <button
            onClick={() => setShowWarnings(!showWarnings)}
            className={cn(
              'inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md',
              showWarnings
                ? 'border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            )}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            {showWarnings ? 'Hide' : 'Show'} Warnings
          </button>
        </div>
      </div>

      {/* Privacy Groups */}
      <div className="space-y-4">
        {PRIVACY_GROUPS.map((group) => (
          <div key={group.id} className="bg-white rounded-lg border border-gray-200">
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <group.icon className="w-5 h-5 text-gray-400" />
                <div>
                  <h4 className="font-medium text-gray-900">{group.title}</h4>
                  <p className="text-sm text-gray-500">{group.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {group.settings.some(s => s.premium && !isPremium) && (
                  <Badge variant="outline">Premium Features</Badge>
                )}
                <div className={cn(
                  'transform transition-transform',
                  expandedGroups.includes(group.id) ? 'rotate-90' : ''
                )}>
                  ▶
                </div>
              </div>
            </button>

            {expandedGroups.includes(group.id) && (
              <div className="px-6 pb-6 space-y-3">
                {group.settings.map(setting => renderSetting(setting, group.id))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Notifications Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-gray-400" />
          <div>
            <h4 className="font-medium text-gray-900">Notification Preferences</h4>
            <p className="text-sm text-gray-500">Choose what privacy-related events you want to be notified about</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'notifyOnProfileView', label: 'Profile Views', description: 'When someone views your profile' },
            { key: 'notifyOnMentions', label: 'Mentions', description: 'When you are mentioned by others' },
            { key: 'notifyOnComments', label: 'Comments', description: 'When someone comments on your content' },
            { key: 'notifyOnDataExport', label: 'Data Exports', description: 'When your data is exported' }
          ].map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between p-3 border border-gray-100 rounded">
              <div>
                <div className="text-sm font-medium text-gray-900">{label}</div>
                <div className="text-xs text-gray-500">{description}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings[key as keyof PrivacySettings] as boolean}
                  onChange={(e) => handleSettingChange(key as keyof PrivacySettings, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Modal */}
      {showComplianceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Data Compliance Settings</h3>
                    <p className="text-sm text-gray-600">Configure compliance with data protection regulations</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowComplianceModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {DATA_COMPLIANCE_SETTINGS.map(({ key, label, description, required }) => (
                  <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900">{label}</div>
                        {required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{description}</p>
                    </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings[key]}
                        onChange={(e) => handleSettingChange(key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">Compliance Information</div>
                    <div className="text-xs space-y-1">
                      <p>• GDPR compliance is required for users in the European Union</p>
                      <p>• CCPA compliance is required for California residents</p>
                      <p>• Data processing consent is legally required in most jurisdictions</p>
                      <p>• Marketing consent is optional but recommended for transparency</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowComplianceModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Compliance Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Privacy Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-blue-700 font-medium">Profile Status</div>
                <div className="text-blue-600 capitalize">{settings.profileVisibility || 'public'}</div>
              </div>
              <div>
                <div className="text-blue-700 font-medium">Data Retention</div>
                <div className="text-blue-600">
                  {settings.dataRetentionDays === -1 ? 'Forever' : `${settings.dataRetentionDays} days`}
                </div>
              </div>
              <div>
                <div className="text-blue-700 font-medium">Security Level</div>
                <div className="text-blue-600">
                  {settings.requireAuthentication ? 
                    (settings.enableTwoFactor ? 'High' : 'Medium') : 
                    'Standard'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;