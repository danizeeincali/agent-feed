import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * OAuth Consent Page
 *
 * Simulates an OAuth authorization page where users grant permission
 * Currently accepts API keys directly since Anthropic doesn't offer public OAuth
 */
const OAuthConsent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cliDetected, setCliDetected] = useState<boolean>(false);
  const [detectedEmail, setDetectedEmail] = useState<string>('');
  const [detectingCli, setDetectingCli] = useState<boolean>(true);

  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const scope = searchParams.get('scope');
  const state = searchParams.get('state');

  useEffect(() => {
    // Validate OAuth parameters
    if (!redirectUri || !state) {
      setError('Invalid OAuth request: missing parameters');
    }
  }, [redirectUri, state]);

  useEffect(() => {
    // Call detection endpoint on mount
    const detectCLI = async () => {
      try {
        const response = await fetch('/api/claude-code/oauth/detect-cli');
        const data = await response.json();

        if (data.detected) {
          // Pre-populate API key if available
          if (data.encryptedKey) {
            setApiKey(data.encryptedKey);
          }
          // Always set detection state
          setDetectedEmail(data.email || 'Unknown');
          setCliDetected(true);
        }
      } catch (error) {
        console.error('CLI detection failed:', error);
        // Silently fail - user can still enter manually
      } finally {
        setDetectingCli(false);
      }
    };

    detectCLI();
  }, []);

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate API key format
      if (!apiKey.startsWith('sk-ant-api03-')) {
        throw new Error('Invalid API key format. Expected format: sk-ant-api03-...');
      }

      // Redirect back to callback with API key
      const callbackUrl = new URL(redirectUri!);
      callbackUrl.searchParams.set('api_key', apiKey);
      callbackUrl.searchParams.set('state', state!);

      window.location.href = callbackUrl.toString();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Redirect back with error
    const callbackUrl = new URL(redirectUri || '/settings');
    callbackUrl.searchParams.set('error', 'access_denied');
    callbackUrl.searchParams.set('state', state || '');
    window.location.href = callbackUrl.toString();
  };

  if (error && (!redirectUri || !state)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Request</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/settings')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Return to Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Authorize Claude API Access
          </h1>
          <p className="text-gray-600">
            {clientId} is requesting access to your Claude API account
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Requested Permissions:</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>✓ Access Claude AI models</li>
            <li>✓ Generate AI responses ({scope || 'inference'})</li>
            <li>✓ Track API usage</li>
          </ul>
        </div>

        {cliDetected ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            {apiKey ? (
              <p className="text-sm text-green-800">
                <strong>✓ We detected your Claude CLI login ({detectedEmail}).</strong>
                {' '}Click Authorize to continue, or edit the key below.
              </p>
            ) : (
              <p className="text-sm text-green-800">
                <strong>✓ You're logged in to Claude CLI via {detectedEmail} subscription.</strong>
                {' '}Please enter your API key from{' '}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline text-green-900 hover:text-green-700">
                  console.anthropic.com
                </a>
                {' '}to continue.
              </p>
            )}
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Anthropic doesn't currently offer public OAuth.
              Please enter your API key directly. It will be encrypted and stored securely.
            </p>
          </div>
        )}

        <form onSubmit={handleAuthorize} className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
              Anthropic API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Get your API key from{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                console.anthropic.com
              </a>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !apiKey || detectingCli}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {detectingCli ? 'Detecting CLI...' : loading ? 'Authorizing...' : 'Authorize'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading || detectingCli}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>
            This connection is secured with AES-256-GCM encryption.
            Your API key will never be shared with third parties.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OAuthConsent;
