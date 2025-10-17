import React, { useState, useEffect } from 'react';
import { Save, X, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import ProtectedFieldIndicator, { ProtectedFieldWrapper } from './ProtectedFieldIndicator';

interface AgentConfig {
  name: string;
  description: string;
  tools?: string[];
  model?: 'haiku' | 'sonnet' | 'opus';
  color?: string;
  proactive?: boolean;
  priority?: string;
  _protected_config_source?: string;
  _protected?: any;
  _permissions?: any;
  _resource_limits?: any;
  [key: string]: any;
}

interface AgentConfigEditorProps {
  /**
   * Agent name to edit
   */
  agentName: string;

  /**
   * Current agent configuration
   */
  config: AgentConfig;

  /**
   * Whether user is admin (can view protected fields)
   */
  isAdmin?: boolean;

  /**
   * Callback when config is saved
   */
  onSave: (updates: Partial<AgentConfig>) => Promise<void>;

  /**
   * Callback when cancel is clicked
   */
  onCancel?: () => void;

  /**
   * Class name for styling
   */
  className?: string;
}

/**
 * AgentConfigEditor Component
 *
 * Form for editing user-editable agent fields while displaying
 * protected fields as read-only with clear visual indicators.
 *
 * Features:
 * - Form for user-editable fields
 * - Read-only display for protected fields
 * - Visual separation (editable vs protected)
 * - Save functionality for editable fields
 * - Protection indicators
 * - Dark mode support
 */
const AgentConfigEditor: React.FC<AgentConfigEditorProps> = ({
  agentName,
  config,
  isAdmin = false,
  onSave,
  onCancel,
  className = ''
}) => {
  // User-editable fields state
  const [editableFields, setEditableFields] = useState({
    description: config.description || '',
    color: config.color || '#3B82F6',
    proactive: config.proactive || false,
    priority: config.priority || 'P2'
  });

  // UI state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const changed =
      editableFields.description !== config.description ||
      editableFields.color !== config.color ||
      editableFields.proactive !== config.proactive ||
      editableFields.priority !== config.priority;

    setHasChanges(changed);
  }, [editableFields, config]);

  // Handle field changes
  const handleFieldChange = (field: string, value: any) => {
    setEditableFields(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSaveSuccess(false);
  };

  // Handle save
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      await onSave(editableFields);

      setSaveSuccess(true);
      setHasChanges(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    // Reset to original values
    setEditableFields({
      description: config.description || '',
      color: config.color || '#3B82F6',
      proactive: config.proactive || false,
      priority: config.priority || 'P2'
    });
    setHasChanges(false);
    setError(null);
    setSaveSuccess(false);

    if (onCancel) {
      onCancel();
    }
  };

  // Protected fields (example - these would come from the protected config)
  const protectedFields = config._protected?.permissions || {};
  const hasProtectedConfig = !!config._protected_config_source;

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Agent Configuration: {agentName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Edit user-configurable settings for this agent
            </p>
          </div>
          {hasProtectedConfig && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <RefreshCw className="w-3 h-3 inline mr-1" />
              Protected config active
            </div>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="m-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mr-2 flex-shrink-0" />
          <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="m-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center">
          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mr-2 flex-shrink-0" />
          <span className="text-sm text-green-800 dark:text-green-200">Configuration saved successfully!</span>
        </div>
      )}

      {/* Form Content */}
      <div className="p-4 space-y-6">
        {/* User-Editable Fields Section */}
        <div>
          <div className="flex items-center mb-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Editable Settings
            </h4>
          </div>

          <div className="space-y-4">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={editableFields.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                rows={3}
                placeholder="Enter agent description..."
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Display Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={editableFields.color}
                  onChange={(e) => handleFieldChange('color', e.target.value)}
                  className="w-12 h-10 rounded border border-gray-300 dark:border-gray-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={editableFields.color}
                  onChange={(e) => handleFieldChange('color', e.target.value)}
                  className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder="#3B82F6"
                />
              </div>
            </div>

            {/* Proactive */}
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editableFields.proactive}
                  onChange={(e) => handleFieldChange('proactive', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Proactive Mode
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-6 mt-1">
                Allow agent to take proactive actions without explicit requests
              </p>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={editableFields.priority}
                onChange={(e) => handleFieldChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                <option value="P0">P0 - Critical</option>
                <option value="P1">P1 - High</option>
                <option value="P2">P2 - Medium</option>
                <option value="P3">P3 - Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Protected Fields Section */}
        {hasProtectedConfig && isAdmin && (
          <div>
            <div className="flex items-center mb-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Protected Settings
              </h4>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Admin View Only)</span>
            </div>

            <div className="space-y-4">
              {/* API Endpoints (Protected) */}
              {protectedFields.api_endpoints && (
                <ProtectedFieldWrapper fieldName="API Endpoints">
                  <div className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                    {protectedFields.api_endpoints.map((endpoint: any, index: number) => (
                      <div key={index} className="py-1">
                        {endpoint.path} - {endpoint.methods?.join(', ')}
                      </div>
                    ))}
                  </div>
                </ProtectedFieldWrapper>
              )}

              {/* Resource Limits (Protected) */}
              {protectedFields.resource_limits && (
                <ProtectedFieldWrapper fieldName="Resource Limits">
                  <div className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                    <div>Memory: {protectedFields.resource_limits.max_memory || 'N/A'}</div>
                    <div>CPU: {protectedFields.resource_limits.max_cpu_percent || 'N/A'}%</div>
                    <div>Execution Time: {protectedFields.resource_limits.max_execution_time || 'N/A'}</div>
                  </div>
                </ProtectedFieldWrapper>
              )}

              {/* Tool Permissions (Protected) */}
              {protectedFields.tool_permissions && (
                <ProtectedFieldWrapper fieldName="Tool Permissions">
                  <div className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                    <div className="mb-2">
                      <strong>Allowed:</strong> {protectedFields.tool_permissions.allowed?.join(', ') || 'None'}
                    </div>
                    {protectedFields.tool_permissions.forbidden && (
                      <div>
                        <strong>Forbidden:</strong> {protectedFields.tool_permissions.forbidden.join(', ')}
                      </div>
                    )}
                  </div>
                </ProtectedFieldWrapper>
              )}
            </div>
          </div>
        )}

        {/* Info Message for Non-Admin */}
        {hasProtectedConfig && !isAdmin && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              This agent has protected configuration settings that are managed by system administrators.
              Protected settings include API access, resource limits, and security policies.
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex items-center justify-end space-x-3">
        <button
          onClick={handleCancel}
          disabled={saving}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4 inline mr-1" />
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AgentConfigEditor;
