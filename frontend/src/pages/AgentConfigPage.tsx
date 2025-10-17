import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Settings, ChevronLeft, User } from 'lucide-react';
import AgentConfigEditor from '../components/AgentConfigEditor';
import ProtectedConfigPanel from '../components/admin/ProtectedConfigPanel';
import { protectedConfigsApi } from '../api/protectedConfigs';

interface AgentConfigPageProps {
  /**
   * Whether the current user is an admin
   */
  isAdmin?: boolean;

  /**
   * Current user ID
   */
  userId?: string;
}

/**
 * AgentConfigPage Component
 *
 * Main page for agent configuration management.
 *
 * Features:
 * - Agent list/selector
 * - AgentConfigEditor component
 * - Admin panel (if user is admin)
 * - Save/cancel actions
 * - Loading states
 */
const AgentConfigPage: React.FC<AgentConfigPageProps> = ({
  isAdmin = false,
  userId = 'anonymous'
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedAgent = searchParams.get('agent');

  // State
  const [agents, setAgents] = useState<string[]>([]);
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available agents on mount
  useEffect(() => {
    loadAgents();
  }, []);

  // Load config when agent is selected
  useEffect(() => {
    if (selectedAgent) {
      loadAgentConfig(selectedAgent);
    }
  }, [selectedAgent]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);

      // In production, this would fetch from API
      // For now, use mock data
      const mockAgents = [
        'strategic-planner',
        'meta-agent',
        'production-validator',
        'impact-filter-agent',
        'personal-todos-agent'
      ];

      setAgents(mockAgents);
    } catch (err) {
      setError('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const loadAgentConfig = async (agentName: string) => {
    try {
      setLoading(true);
      setError(null);

      // Try to load protected config
      let config;
      try {
        config = await protectedConfigsApi.getProtectedConfig(agentName);
      } catch (err) {
        // If protected config doesn't exist, use mock user config
        config = {
          name: agentName,
          description: `${agentName} agent configuration`,
          tools: ['Read', 'Write', 'Bash', 'Grep', 'Glob'],
          model: 'sonnet',
          color: '#3B82F6',
          proactive: true,
          priority: 'P2'
        };
      }

      setCurrentConfig(config);
    } catch (err) {
      setError(`Failed to load config for ${agentName}`);
      setCurrentConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAgentSelect = (agentName: string) => {
    setSearchParams({ agent: agentName });
  };

  const handleSave = async (updates: any) => {
    if (!selectedAgent) return;

    try {
      // Save user-editable fields
      // In production, this would call the API to update agent config
      console.log('Saving config updates:', updates);

      // Update local state
      setCurrentConfig((prev: any) => ({ ...prev, ...updates }));

      // Show success (handled by AgentConfigEditor)
    } catch (err) {
      throw new Error('Failed to save configuration');
    }
  };

  const handleCancel = () => {
    // Reload config to discard changes
    if (selectedAgent) {
      loadAgentConfig(selectedAgent);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-gray-500" />
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Agent Configuration
                  </h1>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage agent settings and configurations
                </p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                <User className="w-3 h-3" />
                <span>Admin Access</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Agent Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Select Agent
              </h3>
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {agents.map((agent) => (
                    <button
                      key={agent}
                      onClick={() => handleAgentSelect(agent)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedAgent === agent
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-medium'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {agent}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {selectedAgent && currentConfig ? (
              <>
                {/* Agent Config Editor */}
                <AgentConfigEditor
                  agentName={selectedAgent}
                  config={currentConfig}
                  isAdmin={isAdmin}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />

                {/* Admin Panel */}
                {isAdmin && (
                  <ProtectedConfigPanel
                    onFetchConfigs={protectedConfigsApi.getAllProtectedConfigs}
                    onFetchConfig={protectedConfigsApi.getProtectedConfig}
                    onUpdateConfig={protectedConfigsApi.updateProtectedConfig}
                    onFetchAuditLog={protectedConfigsApi.getAuditLog}
                    onRollback={protectedConfigsApi.rollbackConfig}
                    onFetchBackups={protectedConfigsApi.getBackups}
                  />
                )}
              </>
            ) : (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-12 text-center">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No Agent Selected
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select an agent from the list to view and edit its configuration.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentConfigPage;
