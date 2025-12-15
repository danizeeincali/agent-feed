import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { ClaudeAuthentication } from '../components/settings/ClaudeAuthentication';
import { Settings as SettingsIcon, Shield, Bell, Palette } from 'lucide-react';

export const Settings: React.FC = () => {
  return (
    <div className="settings-page p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <SettingsIcon className="h-8 w-8 text-blue-600" />
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account preferences and authentication
          </p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Claude Code Authentication Section */}
          <ClaudeAuthentication />

          {/* Additional Settings Sections (Placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-purple-600" />
                Privacy & Security
              </CardTitle>
              <CardDescription>
                Manage your privacy settings and security preferences
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-6 w-6 text-orange-600" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-6 w-6 text-pink-600" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of your dashboard
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
