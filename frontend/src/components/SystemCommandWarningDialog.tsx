import React from 'react';
import { AlertTriangle, X, FolderLock, FileLock, Terminal, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';

interface SystemCommandWarningDialogProps {
  isOpen: boolean;
  detectedPattern: string | null;
  description: string | null;
  reason: 'blocked_directory' | 'protected_file' | 'shell_command' | 'destructive_operation' | null;
  onCancel: () => void;
  onContinue: () => void;
}

const SystemCommandWarningDialog: React.FC<SystemCommandWarningDialogProps> = ({
  isOpen,
  detectedPattern,
  description,
  reason,
  onCancel,
  onContinue
}) => {
  if (!isOpen) return null;

  // Get icon based on reason
  const getIcon = () => {
    switch (reason) {
      case 'blocked_directory':
        return <FolderLock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case 'protected_file':
        return <FileLock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case 'shell_command':
        return <Terminal className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case 'destructive_operation':
        return <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
    }
  };

  // Get title based on reason
  const getTitle = () => {
    switch (reason) {
      case 'blocked_directory':
        return 'Protected Directory Detected';
      case 'protected_file':
        return 'Protected File Detected';
      case 'shell_command':
        return 'System Command Detected';
      case 'destructive_operation':
        return 'Destructive Operation Detected';
      default:
        return 'System Operation Detected';
    }
  };

  // Get warning message based on reason
  const getWarningMessage = () => {
    switch (reason) {
      case 'blocked_directory':
        return {
          title: 'This directory is read-only',
          description: 'The directory you\'re trying to access is protected to keep application code safe.',
          bullets: [
            'All directories except /prod/ are read-only',
            'Frontend, backend, and configuration directories cannot be modified',
            'This prevents accidental damage to the application'
          ]
        };
      case 'protected_file':
        return {
          title: 'This file is protected',
          description: 'The file you\'re trying to modify is protected to prevent breaking the application.',
          bullets: [
            'Package files (package.json, package-lock.json)',
            'Environment files (.env, .gitignore)',
            'Configuration files (tsconfig.json, vite.config.ts)',
            'Version control (.git/), Dependencies (node_modules/)'
          ]
        };
      case 'shell_command':
        return {
          title: 'System command detected',
          description: 'Your post contains a shell command that could modify system files.',
          bullets: [
            'Commands like rm, mv, sudo can delete or modify files',
            'Always specify paths in the safe zone when using commands',
            'The backend will validate all filesystem operations'
          ]
        };
      case 'destructive_operation':
        return {
          title: 'Destructive operation detected',
          description: 'Your post contains keywords associated with destructive operations.',
          bullets: [
            'Operations like "delete file" or "drop table" can be irreversible',
            'Make sure you\'re targeting the correct files/data',
            'The backend will validate all operations'
          ]
        };
      default:
        return {
          title: 'System operation detected',
          description: 'Your post appears to contain a system operation.',
          bullets: [
            'File operations (create, delete, modify)',
            'Shell commands or scripts',
            'System configuration changes'
          ]
        };
    }
  };

  const warningContent = getWarningMessage();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 animate-fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full animate-slide-up">
          {/* Header */}
          <div className="flex items-start gap-3 p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              {getIcon()}
            </div>

            <div className="flex-1">
              <h2
                id="dialog-title"
                className="text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
                {getTitle()}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {warningContent.description}
              </p>
            </div>

            <button
              onClick={onCancel}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Detected Pattern */}
            {detectedPattern && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Detected pattern:
                </p>
                <div className="bg-gray-100 dark:bg-gray-900 rounded px-3 py-2 font-mono text-sm text-gray-800 dark:text-gray-200 break-all">
                  {detectedPattern}
                </div>
                {description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ({description})
                  </p>
                )}
              </div>
            )}

            {/* Warning Details */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                {warningContent.title}
              </h3>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                {warningContent.bullets.map((bullet, index) => (
                  <li key={index}>{bullet}</li>
                ))}
              </ul>
            </div>

            {/* Safe Zone Notice - Only show for directory/file warnings */}
            {(reason === 'blocked_directory' || reason === 'protected_file') && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">
                  ✓ Safe Zone (Unrestricted Access)
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mb-2">
                  You can work freely in the agent workspace:
                </p>
                <div className="bg-green-100 dark:bg-green-900/40 rounded px-3 py-2 font-mono text-xs text-green-800 dark:text-green-200 break-all">
                  /workspaces/agent-feed/prod/agent_workspace/
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  All files in <code className="font-mono">agent_workspace/</code> can be created, modified, or deleted without restrictions.
                </p>
              </div>
            )}

            {/* Backend Validation Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> If you continue, the backend will perform final validation. Protected paths will be blocked regardless of this warning.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
            <button
              onClick={onCancel}
              autoFocus
              className={cn(
                "flex-1 px-4 py-2 rounded-lg font-medium transition-colors",
                "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300",
                "border border-gray-300 dark:border-gray-600",
                "hover:bg-gray-50 dark:hover:bg-gray-700",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              )}
            >
              Cancel
            </button>

            <button
              onClick={onContinue}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg font-medium transition-colors",
                "bg-yellow-600 hover:bg-yellow-700 text-white",
                "focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
              )}
            >
              Continue Anyway
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SystemCommandWarningDialog;
