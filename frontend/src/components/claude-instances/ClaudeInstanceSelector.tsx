/**
 * Claude Instance Selector Component
 * Dropdown selector for choosing between available Claude instances
 * Integrates with existing UI patterns and WebSocket system
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Plus, Play, Square, RotateCcw, Trash2, Server, Zap } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  ClaudeInstance,
  ClaudeInstanceSelectorProps,
  ClaudeInstanceConfig
} from '../../types/claude-instances';
import { InstanceStatusIndicator } from './InstanceStatusIndicator';
import { useNLDComponentMonitoring } from '../../patterns/nld-component-watcher';
import { useNLDPatternDetection } from '../../patterns/nld-core-monitor';

const TERMINAL_COMMAND_MAPPINGS = [
  {
    id: 'prod-claude',
    name: 'Production Claude',
    command: 'cd prod && claude',
    description: 'Launch Claude in production environment',
    icon: '🚀',
    config: {
      workingDirectory: '/workspaces/agent-feed/prod',
      useProductionMode: true,
      name: 'Production Claude'
    }
  },
  {
    id: 'skip-permissions',
    name: 'Skip Permissions',
    command: 'claude --dangerously-skip-permissions',
    description: 'Launch with permissions skipped',
    icon: '⚡',
    config: {
      skipPermissions: true,
      name: 'Skip Permissions Claude'
    }
  },
  {
    id: 'continue-session',
    name: 'Continue Session',
    command: 'claude -c',
    description: 'Continue previous session',
    icon: '🔄',
    config: {
      resumeSession: true,
      name: 'Continue Claude Session'
    }
  },
  {
    id: 'resume-session',
    name: 'Resume Session',
    command: 'claude --resume',
    description: 'Resume interrupted session',
    icon: '↻',
    config: {
      resumeSession: true,
      name: 'Resume Claude Session'
    }
  }
];

export const ClaudeInstanceSelector: React.FC<ClaudeInstanceSelectorProps> = ({
  instances = [],
  selectedInstance,
  onSelect,
  onCreateNew,
  showCreateButton = true,
  className,
  placeholder = 'Select Claude Instance'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // NLD Monitoring
  const { detector } = useNLDPatternDetection();
  const { recordRender, recordError } = useNLDComponentMonitoring('ClaudeInstanceSelector', detector);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowQuickCreate(false);
        setError(null); // Clear error when closing
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Monitor for white screen recovery events
  useEffect(() => {
    const handleForceRerender = () => {
      // Force component re-render for white screen recovery
      setIsOpen(false);
      setShowQuickCreate(false);
    };
    
    window.addEventListener('nld-force-rerender', handleForceRerender);
    return () => window.removeEventListener('nld-force-rerender', handleForceRerender);
  }, []);
  
  // Record component mount
  useEffect(() => {
    recordRender();
    
    // Check for empty instances (potential issue)
    if (detector && instances.length === 0 && showCreateButton) {
      // This might indicate an initialization issue
      setTimeout(() => {
        if (instances.length === 0) {
          detector.detectPattern('nld-001', {
            component: 'ClaudeInstanceSelector',
            userAgent: navigator.userAgent,
            url: window.location.href,
            networkState: navigator.onLine ? 'online' : 'offline'
          }, 'No instances available after mount - potential initialization failure');
        }
      }, 3000); // Wait 3 seconds before flagging as issue
    }
  }, [recordRender, detector, instances.length, showCreateButton]);

  const handleSelect = useCallback((instance: ClaudeInstance | null) => {
    const startTime = performance.now();
    
    try {
      onSelect(instance);
      setIsOpen(false);
      
      // Record successful selection
      recordRender(performance.now() - startTime);
      
      // Detect race condition if multiple rapid selections
      if (detector && startTime - (window as any).lastSelectionTime < 100) {
        detector.detectPattern('nld-004', {
          component: 'ClaudeInstanceSelector',
          userAgent: navigator.userAgent,
          url: window.location.href,
          networkState: navigator.onLine ? 'online' : 'offline'
        }, 'Rapid instance selection detected (potential race condition)');
      }
      
      (window as any).lastSelectionTime = startTime;
    } catch (error) {
      recordError(error as Error);
      throw error;
    }
  }, [onSelect, recordRender, recordError, detector]);

  const handleQuickCreate = useCallback(async (mapping: typeof TERMINAL_COMMAND_MAPPINGS[0]) => {
    const startTime = performance.now();
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Make API call to backend to create Claude instance
      const response = await fetch('http://localhost:3000/api/claude/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: mapping.name,
          command: mapping.command,
          description: mapping.description,
          config: mapping.config
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create instance: ${response.statusText}`);
      }
      
      const newInstance = await response.json();
      console.log('✅ Instance created successfully:', newInstance);
      
      // Call the onCreateNew callback if provided
      if (onCreateNew) {
        onCreateNew();
      }
      
      setShowQuickCreate(false);
      setIsOpen(false);
      
      recordRender(performance.now() - startTime);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create instance';
      setError(errorMessage);
      console.error('❌ Instance creation failed:', errorMessage);
      
      recordError(error as Error);
      
      // Detect white screen potential
      if (detector) {
        detector.detectPattern('nld-001', {
          component: 'ClaudeInstanceSelector',
          userAgent: navigator.userAgent,
          url: window.location.href,
          networkState: navigator.onLine ? 'online' : 'offline'
        }, `Instance creation failed: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onCreateNew, recordRender, recordError, detector]);

  // Fetch instances from API
  const fetchInstances = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3000/api/claude/instances', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch instances: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📋 Fetched instances from API:', data);
      
      // If we have an onSelect callback and no instances are provided via props,
      // we could potentially update the parent component
      // For now, just log the available instances
      
    } catch (error) {
      console.error('❌ Failed to fetch instances:', error);
      // Don't set component error for fetch failures, as it might be expected
    }
  }, []);

  // Fetch instances on mount if no instances are provided
  useEffect(() => {
    if (instances.length === 0) {
      fetchInstances();
    }
  }, [instances.length, fetchInstances]);

  // Get status color for the selected instance
  const getStatusColor = (instance: ClaudeInstance | null) => {
    if (!instance) return 'text-gray-400';
    
    switch (instance.status) {
      case 'running': return 'text-green-500';
      case 'starting': return 'text-blue-500';
      case 'stopping': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      case 'stopped': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  // Separate running and stopped instances
  const runningInstances = instances.filter(i => i.status === 'running');
  const stoppedInstances = instances.filter(i => i.status !== 'running');

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Main Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between w-full px-4 py-3 bg-white dark:bg-gray-800',
          'border border-gray-300 dark:border-gray-600 rounded-lg',
          'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
          'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          'text-left text-sm font-medium'
        )}
        type="button"
      >
        <div className="flex items-center space-x-3">
          <div className={cn('w-2 h-2 rounded-full', getStatusColor(selectedInstance))}>
            {selectedInstance?.status === 'running' && (
              <div className="w-2 h-2 rounded-full animate-pulse bg-current" />
            )}
          </div>
          
          {selectedInstance ? (
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900 dark:text-white">
                {selectedInstance.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({selectedInstance.status})
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
            </div>
          )}
        </div>

        <ChevronDown className={cn(
          'w-4 h-4 text-gray-400 transition-transform duration-200',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={cn(
          'absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800',
          'border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50',
          'max-h-96 overflow-y-auto'
        )}>
          {/* Clear Selection */}
          <button
            onClick={() => handleSelect(null)}
            className="flex items-center w-full px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Square className="w-4 h-4 mr-3" />
            No instance selected
          </button>

          {/* Running Instances Section */}
          {runningInstances.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                Running Instances ({runningInstances.length})
              </div>
              {runningInstances.map((instance) => (
                <button
                  key={instance.id}
                  onClick={() => handleSelect(instance)}
                  className={cn(
                    'flex items-center justify-between w-full px-4 py-3 text-sm',
                    'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                    selectedInstance?.id === instance.id && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <InstanceStatusIndicator 
                      instance={instance} 
                      size="sm" 
                      showDetails={false}
                    />
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {instance.name}
                      </div>
                      {instance.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {instance.description}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {instance.uptime && (
                      <span className="text-xs text-gray-400">
                        {Math.floor(instance.uptime / 60)}m
                      </span>
                    )}
                    {selectedInstance?.id === instance.id && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Stopped Instances Section */}
          {stoppedInstances.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                Stopped Instances ({stoppedInstances.length})
              </div>
              {stoppedInstances.map((instance) => (
                <button
                  key={instance.id}
                  onClick={() => handleSelect(instance)}
                  className={cn(
                    'flex items-center justify-between w-full px-4 py-3 text-sm',
                    'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors opacity-75',
                    selectedInstance?.id === instance.id && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <InstanceStatusIndicator 
                      instance={instance} 
                      size="sm" 
                      showDetails={false}
                    />
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {instance.name}
                      </div>
                      {instance.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {instance.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedInstance?.id === instance.id && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </button>
              ))}
            </>
          )}

          {/* Quick Create Section */}
          {showCreateButton && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700" />
              
              {/* Error Display */}
              {error && (
                <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                  <div className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
                    <span>❌</span>
                    <span>{error}</span>
                  </div>
                </div>
              )}
              
              {!showQuickCreate ? (
                <button
                  onClick={() => setShowQuickCreate(true)}
                  disabled={isLoading}
                  className={cn(
                    'flex items-center w-full px-4 py-3 text-sm text-blue-600 dark:text-blue-400 transition-colors',
                    'hover:bg-gray-50 dark:hover:bg-gray-700',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Plus className="w-4 h-4 mr-3" />
                  {isLoading ? 'Creating Instance...' : 'Create New Instance'}
                </button>
              ) : (
                <>
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                    Quick Launch Templates {isLoading && '(Creating...)'}
                  </div>
                  {TERMINAL_COMMAND_MAPPINGS.map((mapping) => (
                    <button
                      key={mapping.id}
                      onClick={() => handleQuickCreate(mapping)}
                      disabled={isLoading}
                      className={cn(
                        'flex items-center justify-between w-full px-4 py-3 text-sm transition-colors',
                        'hover:bg-gray-50 dark:hover:bg-gray-700',
                        isLoading && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{isLoading ? '⏳' : mapping.icon}</span>
                        <div className="text-left">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {isLoading ? 'Creating...' : mapping.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {isLoading ? 'Please wait...' : mapping.description}
                          </div>
                        </div>
                      </div>
                      {isLoading ? (
                        <div className="w-4 h-4 animate-spin border-2 border-gray-300 border-t-blue-500 rounded-full" />
                      ) : (
                        <Play className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setShowQuickCreate(false)}
                    className="flex items-center w-full px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700"
                  >
                    Back to instances
                  </button>
                </>
              )}
            </>
          )}

          {/* Empty State */}
          {instances.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-2">No instances available</p>
              {showCreateButton && (
                <button
                  onClick={() => setShowQuickCreate(true)}
                  className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                >
                  Create your first instance
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClaudeInstanceSelector;