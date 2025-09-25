/**
 * Dual Instance Page
 * 
 * Dedicated page for Claude instance management with tabbed interface
 * for launcher, monitor, and terminal views.
 */

import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Server, 
  Terminal, 
  Settings, 
  Activity,
  ArrowLeft,
  Users,
  Play
} from 'lucide-react';
import InstanceLauncher from '@/components/InstanceLauncher';
import DualInstanceMonitor from '@/components/DualInstanceMonitor';
import TerminalView from '@/components/TerminalView';
import { useInstanceManager } from '../hooks/useInstanceManager';

type TabType = 'launcher' | 'monitor' | 'terminal';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
}

const TABS: Tab[] = [
  {
    id: 'launcher',
    label: 'Instance Launcher',
    icon: Play,
    description: 'Launch and manage Claude instances'
  },
  {
    id: 'monitor',
    label: 'Dual Monitor',
    icon: Activity,
    description: 'Real-time instance monitoring'
  },
  {
    id: 'terminal',
    label: 'Terminal',
    icon: Terminal,
    description: 'Interactive terminal sessions'
  }
];

export const DualInstancePage: React.FC = () => {
  const { tab, instanceId } = useParams<{ tab?: string; instanceId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { instances, stats } = useInstanceManager();
  
  // Determine active tab from URL
  const activeTab: TabType = (tab as TabType) || 'launcher';
  
  // Validate tab
  const validTab = TABS.find(t => t.id === activeTab);
  if (!validTab) {
    // Redirect to default tab if invalid
    navigate('/dual-instance/launcher', { replace: true });
    return null;
  }

  // CRITICAL FIX: Improved terminal tab routing with better instance handling
  React.useEffect(() => {
    // Only handle terminal tab redirects when we actually have instance data
    if (activeTab === 'terminal' && !instanceId && instances.length > 0) {
      const safeInstances = Array.isArray(instances) ? instances : [];
      const validInstances = safeInstances.filter(i => i && i.id);
      
      if (validInstances.length > 0) {
        // Always use the first available instance for terminal
        const targetInstance = validInstances[0];
        console.log('Terminal: Using available instance:', targetInstance.id);
        navigate(`/dual-instance/terminal/${targetInstance.id}`, { replace: true });
      } else if (safeInstances.length === 0) {
        // Only redirect to launcher if we have confirmed no instances
        console.log('Terminal: No instances available, staying on terminal tab');
        // Don't redirect - let the user see the "no instances" message
      }
    }
  }, [activeTab, instanceId, instances, navigate]);

  /**
   * Handle tab change
   */
  const handleTabChange = (tabId: TabType) => {
    if (tabId === 'terminal' && instanceId) {
      navigate(`/dual-instance/${tabId}/${instanceId}`);
    } else {
      navigate(`/dual-instance/${tabId}`);
    }
  };

  /**
   * Go back to performance dashboard
   */
  const goBack = () => {
    navigate('/performance');
  };

  /**
   * Get running instances for terminal tab
   * Apply defensive programming to handle undefined/null instances array
   */
  const safeInstances = Array.isArray(instances) ? instances : [];
  const runningInstances = safeInstances.filter(i => i && i.status === 'running' && i.id);
  
  // CRITICAL FIX: Improved instance selection logic with better fallbacks
  const selectedInstance = React.useMemo(() => {
    if (!instanceId) {
      console.log('No instanceId provided for terminal');
      return null;
    }
    
    // First try exact ID match
    let instance = safeInstances.find(i => i && i.id === instanceId);
    
    // IMPROVED: If no exact match, try to find any available instance
    if (!instance && safeInstances.length > 0) {
      instance = safeInstances[0]; // Use first available instance regardless of status
      console.log('Using first available instance as fallback:', instance.id, instance.status);
      // Don't navigate here to prevent redirect loops
    }
    
    if (!instance) {
      console.log('Instance not found for ID:', instanceId, 'Available instances:', safeInstances.map(i => ({ id: i?.id, status: i?.status })));
    } else {
      console.log('Selected instance for terminal:', { id: instance.id, status: instance.status, pid: instance.pid });
    }
    
    return instance;
  }, [instanceId, safeInstances]);

  /**
   * Render tab content
   */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'launcher':
        return <InstanceLauncher />;
      
      case 'monitor':
        return <DualInstanceMonitor />;
      
      case 'terminal':
        if (!instanceId) {
          return (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <Terminal className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Terminal Session</h3>
                <p className="text-gray-600 mb-4">
                  {runningInstances.length === 0 
                    ? 'No running instances available. Launch an instance first.'
                    : 'Select a running instance to open terminal.'}
                </p>
                {runningInstances.length === 0 ? (
                  <button
                    onClick={() => handleTabChange('launcher')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Launch Instance
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 mb-3">Available instances:</p>
                    {runningInstances.map(instance => (
                      <button
                        key={instance.id}
                        onClick={() => navigate(`/dual-instance/terminal/${instance.id}`)}
                        className="block w-full px-4 py-2 text-left bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <div className="font-medium">{instance.name}</div>
                        <div className="text-sm text-gray-600">{instance.type} • PID: {instance.pid}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        }
        
        if (!selectedInstance) {
          return (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <Terminal className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Connecting to Instance</h3>
                <p className="text-gray-600 mb-4">
                  {safeInstances.length > 0 
                    ? 'Loading instance terminal...' 
                    : 'No instances available. Launch an instance to access terminal.'}
                </p>
                {safeInstances.length === 0 && (
                  <button
                    onClick={() => handleTabChange('launcher')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Launch Instance
                  </button>
                )}
              </div>
            </div>
          );
        }
        
        return <TerminalView />;
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Title Section */}
            <div className="flex items-center gap-4">
              <button
                onClick={goBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Server className="w-6 h-6" />
                  Claude Instance Manager
                </h1>
                <p className="text-gray-600 text-sm">
                  Launch, monitor, and control Claude instances
                </p>
              </div>
            </div>

            {/* Stats Section */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Running: {stats.running}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-600">Stopped: {stats.stopped}</span>
                </div>
                {stats.error > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600">Error: {stats.error}</span>
                  </div>
                )}
              </div>
              
              {stats.running === 2 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Dual Mode</span>
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-0 border-b">
            {TABS.map((tabDef) => {
              const isActive = activeTab === tabDef.id;
              const isDisabled = tabDef.id === 'terminal' && runningInstances.length === 0;
              
              return (
                <button
                  key={tabDef.id}
                  onClick={() => handleTabChange(tabDef.id)}
                  className={`
                    flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors
                    ${isActive 
                      ? 'border-blue-500 text-blue-600 bg-blue-50' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                  title={tabDef.description}
                >
                  <tabDef.icon className="w-4 h-4" />
                  {tabDef.label}
                  {tabDef.id === 'terminal' && instanceId && selectedInstance && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
                      {selectedInstance.name.split('-').pop()?.slice(0, 8)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Terminal Instance Selector */}
          {activeTab === 'terminal' && runningInstances.length > 1 && (
            <div className="py-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Instance:</span>
                <select
                  value={instanceId || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      navigate(`/dual-instance/terminal/${e.target.value}`);
                    }
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {runningInstances.map(instance => (
                    <option key={instance.id} value={instance.id}>
                      {instance.name} ({instance.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`${activeTab === 'terminal' ? 'h-[calc(100vh-140px)]' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'}`}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default DualInstancePage;