import React, { useState, useEffect } from 'react';
import { Shield, Edit, RotateCcw, Eye, AlertTriangle, CheckCircle, X, RefreshCw, Clock } from 'lucide-react';
import { ProtectedBadge } from '../ProtectedFieldIndicator';

interface ProtectedConfig {
  version: string;
  checksum: string;
  agent_id: string;
  permissions: any;
  _metadata?: {
    created_at?: string;
    updated_at?: string;
    version?: string;
  };
}

interface AuditLogEntry {
  timestamp: string;
  action: string;
  user?: string;
  changes?: any;
  version?: string;
}

interface BackupMetadata {
  timestamp: number;
  version: string;
  path: string;
  size: number;
  checksum: string;
}

interface ProtectedConfigPanelProps {
  /**
   * API client for fetching configs
   */
  onFetchConfigs: () => Promise<Array<{ agentName: string; hasProtection: boolean }>>;

  /**
   * API client for fetching specific config
   */
  onFetchConfig: (agentName: string) => Promise<ProtectedConfig>;

  /**
   * API client for updating config
   */
  onUpdateConfig: (agentName: string, updates: any) => Promise<void>;

  /**
   * API client for fetching audit log
   */
  onFetchAuditLog: (agentName: string) => Promise<AuditLogEntry[]>;

  /**
   * API client for rollback
   */
  onRollback: (agentName: string, version?: string) => Promise<void>;

  /**
   * API client for fetching backups
   */
  onFetchBackups: (agentName: string) => Promise<BackupMetadata[]>;

  /**
   * Class name for styling
   */
  className?: string;
}

/**
 * ProtectedConfigPanel Component
 *
 * Admin-only panel for managing protected agent configurations.
 *
 * Features:
 * - List all agents with protection status
 * - Edit protected configs (admin only)
 * - Preview changes before applying
 * - Audit log viewer
 * - Rollback functionality
 * - Backup management
 */
const ProtectedConfigPanel: React.FC<ProtectedConfigPanelProps> = ({
  onFetchConfigs,
  onFetchConfig,
  onUpdateConfig,
  onFetchAuditLog,
  onRollback,
  onFetchBackups,
  className = ''
}) => {
  // State
  const [agents, setAgents] = useState<Array<{ agentName: string; hasProtection: boolean }>>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<ProtectedConfig | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedConfig, setEditedConfig] = useState<any>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showBackups, setShowBackups] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load agents on mount
  useEffect(() => {
    loadAgents();
  }, []);

  // Load selected agent config
  useEffect(() => {
    if (selectedAgent) {
      loadAgentConfig(selectedAgent);
    }
  }, [selectedAgent]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const agentList = await onFetchConfigs();
      setAgents(agentList);
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
      const config = await onFetchConfig(agentName);
      setCurrentConfig(config);
      setEditedConfig(config);
    } catch (err) {
      setError(`Failed to load config for ${agentName}`);
      setCurrentConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLog = async () => {
    if (!selectedAgent) return;
    try {
      const log = await onFetchAuditLog(selectedAgent);
      setAuditLog(log);
      setShowAuditLog(true);
    } catch (err) {
      setError('Failed to load audit log');
    }
  };

  const loadBackups = async () => {
    if (!selectedAgent) return;
    try {
      const backupList = await onFetchBackups(selectedAgent);
      setBackups(backupList);
      setShowBackups(true);
    } catch (err) {
      setError('Failed to load backups');
    }
  };

  const handleSave = async () => {
    if (!selectedAgent || !editedConfig) return;

    try {
      setSaving(true);
      setError(null);
      await onUpdateConfig(selectedAgent, editedConfig);
      setSuccess('Protected configuration updated successfully');
      setEditMode(false);

      // Reload config
      await loadAgentConfig(selectedAgent);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update config');
    } finally {
      setSaving(false);
    }
  };

  const handleRollback = async (version?: string) => {
    if (!selectedAgent) return;

    if (!confirm(`Are you sure you want to rollback ${selectedAgent} to ${version || 'previous version'}?`)) {
      return;
    }

    try {
      setError(null);
      await onRollback(selectedAgent, version);
      setSuccess('Configuration rolled back successfully');

      // Reload config
      await loadAgentConfig(selectedAgent);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to rollback configuration');
    }
  };

  const formatDate = (timestamp: string | number) => {
    const date = new Date(typeof timestamp === 'number' ? timestamp : timestamp);
    return date.toLocaleString();
  };

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Protected Configuration Management
            </h3>
          </div>
          <div className="text-xs text-red-600 dark:text-red-400 font-medium">
            ADMIN ONLY
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage system-protected agent configurations
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="m-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mr-2 flex-shrink-0" />
          <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="m-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center">
          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mr-2 flex-shrink-0" />
          <span className="text-sm text-green-800 dark:text-green-200">{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700">
        {/* Agent List */}
        <div className="p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Agents</h4>
          {loading ? (
            <div className="text-center py-4">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto text-gray-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {agents.map((agent) => (
                <button
                  key={agent.agentName}
                  onClick={() => setSelectedAgent(agent.agentName)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedAgent === agent.agentName
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{agent.agentName}</span>
                    {agent.hasProtection && <ProtectedBadge />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Config Editor */}
        <div className="lg:col-span-2 p-4">
          {selectedAgent && currentConfig ? (
            <div className="space-y-4">
              {/* Config Header */}
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {selectedAgent} Configuration
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={loadAuditLog}
                    className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Clock className="w-3 h-3 inline mr-1" />
                    Audit Log
                  </button>
                  <button
                    onClick={loadBackups}
                    className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3 inline mr-1" />
                    Backups
                  </button>
                  {!editMode ? (
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      <Edit className="w-3 h-3 inline mr-1" />
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditMode(false);
                          setEditedConfig(currentConfig);
                        }}
                        className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Config Content */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-auto">
                  {editMode ? (
                    <textarea
                      value={JSON.stringify(editedConfig, null, 2)}
                      onChange={(e) => {
                        try {
                          setEditedConfig(JSON.parse(e.target.value));
                        } catch (err) {
                          // Invalid JSON, keep editing
                        }
                      }}
                      className="w-full h-96 font-mono text-xs bg-white dark:bg-gray-900 p-2 rounded"
                    />
                  ) : (
                    JSON.stringify(currentConfig, null, 2)
                  )}
                </pre>
              </div>

              {/* Metadata */}
              {currentConfig._metadata && (
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <div>Version: {currentConfig._metadata.version}</div>
                  <div>Updated: {currentConfig._metadata.updated_at && formatDate(currentConfig._metadata.updated_at)}</div>
                  <div>Checksum: {currentConfig.checksum.substring(0, 16)}...</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select an agent to view configuration</p>
            </div>
          )}

          {/* Audit Log Modal */}
          {showAuditLog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-[80vh] overflow-hidden flex flex-col">
                <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Audit Log</h4>
                  <button onClick={() => setShowAuditLog(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 overflow-auto flex-grow">
                  <div className="space-y-3">
                    {auditLog.map((entry, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{entry.action}</span>
                          <span className="text-xs text-gray-500">{formatDate(entry.timestamp)}</span>
                        </div>
                        {entry.user && (
                          <div className="text-xs text-gray-600 dark:text-gray-400">User: {entry.user}</div>
                        )}
                        {entry.version && (
                          <div className="text-xs text-gray-600 dark:text-gray-400">Version: {entry.version}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backups Modal */}
          {showBackups && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-[80vh] overflow-hidden flex flex-col">
                <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Available Backups</h4>
                  <button onClick={() => setShowBackups(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 overflow-auto flex-grow">
                  <div className="space-y-2">
                    {backups.map((backup, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded p-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Version {backup.version}
                          </div>
                          <div className="text-xs text-gray-500">{formatDate(backup.timestamp)}</div>
                        </div>
                        <button
                          onClick={() => handleRollback(backup.version)}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3 inline mr-1" />
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProtectedConfigPanel;
