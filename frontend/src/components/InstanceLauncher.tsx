/**
 * Instance Launcher Component
 * 
 * One-button launcher for Claude instances with configuration options,
 * status monitoring, and integration with the instance management system.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Settings, 
  Terminal, 
  Server, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader
} from 'lucide-react';
import { useNotification } from '../hooks/useNotification';
import { useInstanceManager } from '../hooks/useInstanceManager';

interface LaunchConfig {
  type: 'production' | 'development';
  autoRestart: {
    enabled: boolean;
    intervalHours: number;
    maxRestarts: number;
  };
  workingDirectory: string;
  autoConnect: boolean;
}

const DEFAULT_CONFIG: LaunchConfig = {
  type: 'production',
  autoRestart: {
    enabled: false,
    intervalHours: 4,
    maxRestarts: 5
  },
  workingDirectory: '/workspaces/agent-feed/prod',
  autoConnect: true
};

export const InstanceLauncher: React.FC = () => {
  const [config, setConfig] = useState<LaunchConfig>(DEFAULT_CONFIG);
  const [isLaunching, setIsLaunching] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [lastLaunch, setLastLaunch] = useState<Date | null>(null);
  
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { 
    instances, 
    launchInstance, 
    killInstance, 
    restartInstance,
    loading,
    error 
  } = useInstanceManager();

  // Get current running instances
  const runningInstances = instances.filter(instance => 
    instance.status === 'running'
  );
  
  const hasRunningInstance = runningInstances.length > 0;
  const canLaunch = !isLaunching && !loading;

  /**
   * Launch a new Claude instance with proper timeout and state management
   */
  const handleLaunch = async () => {
    if (!canLaunch) return;

    setIsLaunching(true);
    
    try {
      const launchOptions = {
        type: config.type,
        workingDirectory: config.workingDirectory,
        autoConnect: config.autoConnect,
        name: generateInstanceName(),
        autoRestart: config.autoRestart.enabled ? config.autoRestart : undefined,
        environment: {
          CLAUDE_INSTANCE_TYPE: config.type,
          CLAUDE_AUTO_RESTART: config.autoRestart.enabled.toString()
        }
      };

      // Add timeout protection to prevent hanging
      const launchTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Launch timeout after 30 seconds')), 30000);
      });

      await Promise.race([
        launchInstance(launchOptions),
        launchTimeout
      ]);
      
      setLastLaunch(new Date());
      
      showNotification({
        type: 'success',
        title: 'Instance Launched',
        message: `Claude ${config.type} instance started successfully`,
        duration: 5000
      });

      // Navigate to terminal view if auto-connect is enabled
      // Wait for instance to appear in the instances list with a short polling mechanism
      if (config.autoConnect) {
        let attempts = 0;
        const maxAttempts = 10;
        const checkInstance = () => {
          const runningInstance = instances.find(i => i.status === 'running');
          if (runningInstance) {
            navigate(`/dual-instance/terminal/${runningInstance.id}`);
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkInstance, 500); // Check every 500ms
          }
        };
        setTimeout(checkInstance, 100); // Initial delay to allow state update
      }

    } catch (error) {
      console.error('Instance launch failed:', error);
      showNotification({
        type: 'error',
        title: 'Launch Failed',
        message: error instanceof Error ? error.message : 'Failed to launch instance',
        duration: 10000
      });
    } finally {
      // Ensure loading state is always reset
      setIsLaunching(false);
    }
  };

  /**
   * Kill a running instance
   */
  const handleKill = async (instanceId: string) => {
    try {
      await killInstance();
      
      showNotification({
        type: 'info',
        title: 'Instance Stopped',
        message: 'Claude instance has been stopped',
        duration: 3000
      });

    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Stop Failed',
        message: error instanceof Error ? error.message : 'Failed to stop instance',
        duration: 5000
      });
    }
  };

  /**
   * Restart a running instance
   */
  const handleRestart = async (instanceId: string) => {
    try {
      await restartInstance();
      
      showNotification({
        type: 'success',
        title: 'Instance Restarted',
        message: 'Claude instance has been restarted',
        duration: 5000
      });

      // Navigate to new terminal if auto-connect is enabled
      if (config.autoConnect && instances.length > 0) {
        const runningInstance = instances.find(i => i.status === 'running');
        if (runningInstance) {
          navigate(`/dual-instance/terminal/${runningInstance.id}`);
        }
      }

    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Restart Failed',
        message: error instanceof Error ? error.message : 'Failed to restart instance',
        duration: 5000
      });
    }
  };

  /**
   * Generate instance name from config and timestamp
   */
  const generateInstanceName = (): string => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    return `Claude-${config.type}-${timestamp}`;
  };

  /**
   * Update configuration
   */
  const updateConfig = (updates: Partial<LaunchConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...updates
    }));
  };

  /**
   * Navigate to terminal
   */
  const openTerminal = (instanceId: string) => {
    navigate(`/dual-instance/terminal/${instanceId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Claude Instance Launcher</h2>
          <p className="text-gray-600 mt-1">
            Launch and manage Claude instances with one-click deployment
          </p>
        </div>
        
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          Configure
        </button>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Launch Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Instance Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instance Type
              </label>
              <select
                value={config.type}
                onChange={(e) => updateConfig({ type: e.target.value as 'production' | 'development' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="production">Production</option>
                <option value="development">Development</option>
              </select>
            </div>

            {/* Working Directory */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Working Directory
              </label>
              <input
                type="text"
                value={config.workingDirectory}
                onChange={(e) => updateConfig({ workingDirectory: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="/workspaces/agent-feed/prod"
              />
            </div>

            {/* Auto Connect */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoConnect"
                checked={config.autoConnect}
                onChange={(e) => updateConfig({ autoConnect: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoConnect" className="ml-2 block text-sm text-gray-700">
                Auto-connect to terminal after launch
              </label>
            </div>

            {/* Auto Restart */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoRestart"
                checked={config.autoRestart.enabled}
                onChange={(e) => updateConfig({ 
                  autoRestart: { ...config.autoRestart, enabled: e.target.checked }
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoRestart" className="ml-2 block text-sm text-gray-700">
                Enable auto-restart
              </label>
            </div>

            {/* Auto Restart Settings */}
            {config.autoRestart.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restart Interval (hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={config.autoRestart.intervalHours}
                    onChange={(e) => updateConfig({ 
                      autoRestart: { 
                        ...config.autoRestart, 
                        intervalHours: parseInt(e.target.value) 
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Restarts
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={config.autoRestart.maxRestarts}
                    onChange={(e) => updateConfig({ 
                      autoRestart: { 
                        ...config.autoRestart, 
                        maxRestarts: parseInt(e.target.value) 
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Launch Controls */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Quick Launch</h3>
          {lastLaunch && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              Last launch: {lastLaunch.toLocaleTimeString()}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Launch Button */}
          <button
            onClick={handleLaunch}
            disabled={!canLaunch}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
              ${canLaunch
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isLaunching ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            {isLaunching ? 'Launching...' : 'Launch Claude Instance'}
          </button>

          {/* Instance Type Badge */}
          <div className={`
            px-3 py-1 rounded-full text-sm font-medium
            ${config.type === 'production' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-purple-100 text-purple-800'
            }
          `}>
            {config.type}
          </div>

          {/* Auto Restart Badge */}
          {config.autoRestart.enabled && (
            <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Auto-restart: {config.autoRestart.intervalHours}h
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Running Instances */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Running Instances</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Server className="w-4 h-4" />
            {runningInstances.length} active
          </div>
        </div>

        {runningInstances.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Server className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No running instances</p>
            <p className="text-sm mt-1">Launch an instance to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {runningInstances.map((instance) => (
              <div 
                key={instance.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-2 h-2 rounded-full
                    ${instance.status === 'running' ? 'bg-green-500' : 'bg-yellow-500'}
                  `} />
                  
                  <div>
                    <div className="font-medium text-gray-900">{instance.name}</div>
                    <div className="text-sm text-gray-600">
                      {instance.type} • PID: {instance.pid} • 
                      Started: {new Date(instance.createdAt).toLocaleTimeString()}
                    </div>
                  </div>

                  {instance.status === 'running' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Terminal Button */}
                  <button
                    onClick={() => openTerminal(instance.id)}
                    className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Open Terminal"
                  >
                    <Terminal className="w-4 h-4" />
                    Terminal
                  </button>

                  {/* Restart Button */}
                  <button
                    onClick={() => handleRestart(instance.id)}
                    className="flex items-center gap-1 px-3 py-1 text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                    title="Restart Instance"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restart
                  </button>

                  {/* Stop Button */}
                  <button
                    onClick={() => handleKill(instance.id)}
                    className="flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Stop Instance"
                  >
                    <Square className="w-4 h-4" />
                    Stop
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstanceLauncher;