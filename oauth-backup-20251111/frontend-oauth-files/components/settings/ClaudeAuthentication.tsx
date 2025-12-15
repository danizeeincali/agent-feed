import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Key,
  CreditCard,
  Cloud,
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2
} from 'lucide-react';
import { cn } from '../../utils/cn';

type AuthMode = 'oauth' | 'api-key' | 'pay-as-you-go';

interface AuthSettings {
  mode: AuthMode;
  apiKey?: string;
  oauthConnected?: boolean;
}

interface ClaudeAuthenticationProps {
  userId?: string;
}

export const ClaudeAuthentication: React.FC<ClaudeAuthenticationProps> = ({
  userId = 'demo-user-123'
}) => {
  const [selectedMode, setSelectedMode] = useState<AuthMode>('oauth');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [oauthAvailable, setOauthAvailable] = useState(true);
  const [currentSettings, setCurrentSettings] = useState<AuthSettings | null>(null);
  const [cliDetected, setCLIDetected] = useState(false);
  const [cliInfo, setCLIInfo] = useState<{method: string; email?: string; subscription?: string} | null>(null);
  const [detectingCLI, setDetectingCLI] = useState(true);

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/claude-code/auth-settings?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setCurrentSettings(data.data);
            setSelectedMode(data.data.mode || 'oauth');
            if (data.data.apiKey) {
              setApiKey(data.data.apiKey);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load auth settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [userId]);

  // Detect CLI login on mount
  useEffect(() => {
    const detectCLI = async () => {
      setDetectingCLI(true);
      try {
        const response = await fetch('/api/claude-code/oauth/detect-cli');
        const data = await response.json();

        if (data.detected && data.method === 'oauth') {
          setCLIDetected(true);
          setCLIInfo({
            method: 'oauth',
            email: data.email,
            subscription: data.email
          });
          console.log('✅ CLI OAuth detected:', data);
        } else if (data.detected && data.method === 'api_key') {
          setCLIDetected(true);
          setCLIInfo({
            method: 'api_key',
            email: data.email
          });
          console.log('✅ CLI API key detected:', data);
        } else {
          console.log('ℹ️  No CLI credentials detected');
        }
      } catch (error) {
        console.error('CLI detection failed:', error);
        // Silently fail - user can still use other methods
      } finally {
        setDetectingCLI(false);
      }
    };

    detectCLI();
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      // Validate inputs
      if (selectedMode === 'api-key' && !apiKey.trim()) {
        setError('Please enter an API key');
        setSaving(false);
        return;
      }

      if (selectedMode === 'api-key' && !apiKey.startsWith('sk-')) {
        setError('Invalid API key format. Must start with "sk-"');
        setSaving(false);
        return;
      }

      // Save to backend
      const response = await fetch('/api/claude-code/auth-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          mode: selectedMode,
          apiKey: selectedMode === 'api-key' ? apiKey : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to save settings');
      }

      setSuccess('Authentication settings saved successfully!');
      setCurrentSettings(result.data);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleOAuthConnect = async () => {
    setError(null);
    setSaving(true);

    try {
      if (cliDetected) {
        // Auto-connect using CLI credentials
        const response = await fetch('/api/claude-code/oauth/auto-connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to connect OAuth');
        }

        setSuccess(`Connected via Claude CLI OAuth! (${cliInfo?.email || cliInfo?.subscription || 'authenticated'})`);
        setCurrentSettings({
          mode: 'oauth',
          oauthConnected: true
        });
      } else {
        // No CLI detected - show error
        throw new Error('Claude CLI not detected. Please login to Claude CLI first with: claude login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect OAuth');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-6 w-6 text-blue-600" />
          Claude Code Authentication
        </CardTitle>
        <CardDescription>
          Choose how you want to authenticate with Claude Code API
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Authentication Options */}
        <div className="space-y-4">
          {/* Option A: OAuth (Claude CLI) */}
          <div
            className={cn(
              "border rounded-lg p-4 cursor-pointer transition-all",
              selectedMode === 'oauth'
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                : "border-gray-200 hover:border-gray-300"
            )}
            onClick={() => setSelectedMode('oauth')}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="auth-mode"
                value="oauth"
                checked={selectedMode === 'oauth'}
                onChange={() => setSelectedMode('oauth')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Cloud className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Option A: OAuth (Claude CLI)
                  </h3>
                  {detectingCLI ? (
                    <Badge variant="outline" className="bg-gray-100 text-gray-600">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />
                      Detecting...
                    </Badge>
                  ) : cliDetected ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      ✓ CLI Detected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      CLI Required
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Use your Claude CLI authentication. No API key needed.
                </p>

                {/* CLI Detection Banner */}
                {selectedMode === 'oauth' && !detectingCLI && (
                  <>
                    {cliDetected ? (
                      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-300">
                              Claude CLI Login Detected
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                              {cliInfo?.method === 'oauth'
                                ? `Subscription: ${cliInfo?.subscription || cliInfo?.email || 'Authenticated'}`
                                : `API Key: ${cliInfo?.email || 'Configured'}`
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                              Claude CLI Not Detected
                            </p>
                            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                              Please login to Claude CLI first: <code className="px-1 py-0.5 bg-yellow-100 dark:bg-yellow-800 rounded">claude login</code>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* OAuth Connection Button */}
                    <div className="mt-3">
                      <Button
                        onClick={handleOAuthConnect}
                        disabled={!cliDetected || saving || detectingCLI}
                        className="w-full sm:w-auto"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Connecting...
                          </>
                        ) : currentSettings?.oauthConnected ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Connected via CLI
                          </>
                        ) : (
                          <>
                            <Cloud className="mr-2 h-4 w-4" />
                            {cliDetected ? 'Connect via Claude CLI' : 'Connect with OAuth (Requires CLI)'}
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Connection Status */}
                    {currentSettings?.oauthConnected && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                              OAuth Connected
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                              All Claude API calls will use your CLI credentials.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Option B: User API Key */}
          <div
            className={cn(
              "border rounded-lg p-4 cursor-pointer transition-all",
              selectedMode === 'api-key'
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                : "border-gray-200 hover:border-gray-300"
            )}
            onClick={() => setSelectedMode('api-key')}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="auth-mode"
                value="api-key"
                checked={selectedMode === 'api-key'}
                onChange={() => setSelectedMode('api-key')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Key className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Option B: Your API Key
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Use your own Anthropic API key. You'll be billed directly by Anthropic.
                </p>
                {selectedMode === 'api-key' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        API Key
                      </label>
                      <div className="relative">
                        <Input
                          type={showApiKey ? 'text' : 'password'}
                          placeholder="sk-ant-api03-..."
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="pr-20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          {showApiKey ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        Your API key is encrypted and stored securely. It's never shared with third parties.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Option C: Pay-as-you-go */}
          <div
            className={cn(
              "border rounded-lg p-4 cursor-pointer transition-all",
              selectedMode === 'pay-as-you-go'
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                : "border-gray-200 hover:border-gray-300"
            )}
            onClick={() => setSelectedMode('pay-as-you-go')}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="auth-mode"
                value="pay-as-you-go"
                checked={selectedMode === 'pay-as-you-go'}
                onChange={() => setSelectedMode('pay-as-you-go')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Option C: Pay-as-you-go
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We handle the API calls. You pay only for what you use with transparent pricing.
                </p>
                {selectedMode === 'pay-as-you-go' && (
                  <div className="mt-3 space-y-2">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Current Usage (Today)</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">$2.34</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Total Tokens</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">156,892</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => window.location.href = '/billing'}
                    >
                      View Detailed Billing
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={handleSave}
            disabled={saving || (selectedMode === 'api-key' && !apiKey.trim())}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>

        {/* Current Settings Display */}
        {currentSettings && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Authentication
            </h4>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {currentSettings.mode === 'oauth' ? 'OAuth' :
                 currentSettings.mode === 'api-key' ? 'API Key' :
                 'Pay-as-you-go'}
              </Badge>
              {currentSettings.mode === 'api-key' && currentSettings.apiKey && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Key: {currentSettings.apiKey.substring(0, 12)}...
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClaudeAuthentication;
