/**
 * ClaudeServiceManagerComponent - Global Claude Instance Monitoring Dashboard
 * 
 * React component that provides a global view of all Claude instances managed by
 * ClaudeServiceManager. This component focuses on monitoring, metrics, and global
 * operations without WebSocket dependencies.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ClaudeServiceManager, ClaudeServiceInstance, ClaudeServiceMetrics, createProductionClaudeServiceManager } from '../../services/ClaudeServiceManager';
// CSS handled by global styles

interface ClaudeServiceManagerComponentProps {
  apiUrl?: string;
  refreshInterval?: number;
}

export const ClaudeServiceManagerComponent: React.FC<ClaudeServiceManagerComponentProps> = ({
  apiUrl = 'http://localhost:3000',
  refreshInterval = 5000
}) => {
  const [serviceManager] = useState(() => createProductionClaudeServiceManager(apiUrl));
  const [instances, setInstances] = useState<ClaudeServiceInstance[]>([]);
  const [metrics, setMetrics] = useState<ClaudeServiceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'worker' | 'feed' | 'interactive'>('all');

  // Refresh data from service manager
  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [allInstances, currentMetrics] = await Promise.all([
        serviceManager.getInstances(),
        Promise.resolve(serviceManager.getMetrics())
      ]);

      setInstances(allInstances);
      setMetrics(currentMetrics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      setError(errorMessage);
      console.error('Failed to refresh service manager data:', err);
    } finally {
      setLoading(false);
    }
  }, [serviceManager]);

  // Setup periodic refresh
  useEffect(() => {
    refreshData();
    
    const interval = setInterval(refreshData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshData, refreshInterval]);

  // Setup service manager event listeners
  useEffect(() => {
    const handleInstanceCreated = (instance: ClaudeServiceInstance) => {
      setInstances(prev => [...prev, instance]);
    };

    const handleInstanceTerminated = ({ instanceId }: { instanceId: string }) => {
      setInstances(prev => prev.filter(i => i.id !== instanceId));
    };

    const handleHealthCheck = (updatedMetrics: ClaudeServiceMetrics) => {
      setMetrics(updatedMetrics);
    };

    serviceManager.on('instance:created', handleInstanceCreated);
    serviceManager.on('instance:terminated', handleInstanceTerminated);
    serviceManager.on('health:check', handleHealthCheck);

    return () => {
      serviceManager.off('instance:created', handleInstanceCreated);
      serviceManager.off('instance:terminated', handleInstanceTerminated);
      serviceManager.off('health:check', handleHealthCheck);
    };
  }, [serviceManager]);

  // Create always-on worker instance
  const createWorkerInstance = async () => {
    try {
      setLoading(true);
      setError(null);

      const workerInstance = await serviceManager.createInstance({
        name: 'Always-On Feed Worker',
        type: 'worker',
        workingDirectory: '/workspaces/agent-feed/prod',
        skipPermissions: true,
        autoRestart: true,
        isAlwaysOn: true
      });

      console.log('Created always-on worker instance:', workerInstance.id);
      await refreshData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create worker instance';
      setError(errorMessage);
      console.error('Failed to create worker instance:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create interactive instance
  const createInteractiveInstance = async () => {
    try {
      setLoading(true);
      setError(null);

      const interactiveInstance = await serviceManager.createInstance({
        name: 'Interactive Claude Instance',
        type: 'interactive',
        workingDirectory: '/workspaces/agent-feed/prod',
        skipPermissions: false,
        autoRestart: false,
        isAlwaysOn: false
      });

      console.log('Created interactive instance:', interactiveInstance.id);
      await refreshData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create interactive instance';
      setError(errorMessage);
      console.error('Failed to create interactive instance:', err);
    } finally {
      setLoading(false);
    }
  };

  // Terminate instance
  const terminateInstance = async (instanceId: string) => {
    try {
      setLoading(true);
      setError(null);

      await serviceManager.terminateInstance(instanceId);
      console.log('Terminated instance:', instanceId);
      await refreshData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to terminate instance';
      setError(errorMessage);
      console.error('Failed to terminate instance:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter instances based on selection
  const filteredInstances = instances.filter(instance => {
    if (selectedFilter === 'all') return true;
    return instance.type === selectedFilter;
  });

  // Get worker instance status
  const workerInstance = instances.find(i => i.type === 'worker' && i.isAlwaysOn);

  return (
    <div className="claude-service-manager">
      <div className="header">
        <h2>Claude Service Manager</h2>
        <div className="metrics-summary">
          {metrics && (
            <>
              <span className="metric">
                Total: {metrics.totalInstances}
              </span>
              <span className="metric">
                Running: {metrics.runningInstances}
              </span>
              <span className="metric">
                Workers: {metrics.workerInstances}
              </span>
              <span className="metric">
                Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
              </span>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={refreshData}>Retry</button>
        </div>
      )}

      <div className="controls">
        <div className="filter-controls">
          <label>Filter:</label>
          <select 
            value={selectedFilter} 
            onChange={(e) => setSelectedFilter(e.target.value as any)}
          >
            <option value="all">All Instances</option>
            <option value="worker">Worker Instances</option>
            <option value="feed">Feed Instances</option>
            <option value="interactive">Interactive Instances</option>
          </select>
        </div>

        <div className="action-controls">
          <button 
            onClick={createWorkerInstance} 
            disabled={loading || !!workerInstance}
            className="btn btn-worker"
          >
            {workerInstance ? 'Worker Active' : 'Create Worker Instance'}
          </button>
          
          <button 
            onClick={createInteractiveInstance} 
            disabled={loading}
            className="btn btn-interactive"
          >
            Create Interactive Instance
          </button>
          
          <button 
            onClick={refreshData} 
            disabled={loading}
            className="btn btn-refresh"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="instances-overview">
        <h3>Instances Overview ({filteredInstances.length})</h3>
        
        {filteredInstances.length === 0 ? (
          <div className="no-instances">
            No instances found. Create a worker or interactive instance to get started.
          </div>
        ) : (
          <div className="instances-grid">
            {filteredInstances.map(instance => (
              <div 
                key={instance.id} 
                className={`instance-card ${instance.status} ${instance.type}`}
              >
                <div className="instance-header">
                  <span className="instance-name">{instance.name}</span>
                  <div className="instance-badges">
                    <span className={`badge type-${instance.type === 'skip-permissions-interactive' ? 'worker' : instance.type}`}>
                      {instance.type === 'skip-permissions-interactive' ? 'worker' : instance.type}
                    </span>
                    {instance.isAlwaysOn && (
                      <span className="badge always-on">Always-On</span>
                    )}
                  </div>
                </div>
                
                <div className="instance-details">
                  <div className="detail-row">
                    <span className="label">ID:</span>
                    <span className="value">{instance.id.slice(0, 12)}...</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Status:</span>
                    <span className={`value status-${instance.status}`}>
                      {instance.status}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Directory:</span>
                    <span className="value">{instance.workingDirectory}</span>
                  </div>
                  {instance.pid && (
                    <div className="detail-row">
                      <span className="label">PID:</span>
                      <span className="value">{instance.pid}</span>
                    </div>
                  )}
                  {instance.uptime && (
                    <div className="detail-row">
                      <span className="label">Uptime:</span>
                      <span className="value">{Math.round(instance.uptime / 1000 / 60)}m</span>
                    </div>
                  )}
                  {instance.memoryUsage && (
                    <div className="detail-row">
                      <span className="label">Memory:</span>
                      <span className="value">{(instance.memoryUsage / 1024 / 1024).toFixed(1)}MB</span>
                    </div>
                  )}
                </div>

                <div className="instance-actions">
                  {!instance.isAlwaysOn && (
                    <button 
                      onClick={() => terminateInstance(instance.id)}
                      disabled={loading}
                      className="btn btn-terminate"
                    >
                      Terminate
                    </button>
                  )}
                  {instance.isAlwaysOn && (
                    <span className="protected-notice">Protected Instance</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {workerInstance && (
        <div className="worker-status">
          <h3>Always-On Worker Status</h3>
          <div className="worker-info">
            <div className="worker-detail">
              <span className="label">Worker ID:</span>
              <span className="value">{workerInstance.id}</span>
            </div>
            <div className="worker-detail">
              <span className="label">Status:</span>
              <span className={`value status-${workerInstance.status}`}>
                {workerInstance.status}
              </span>
            </div>
            <div className="worker-detail">
              <span className="label">Directory:</span>
              <span className="value">{workerInstance.workingDirectory}</span>
            </div>
            <div className="worker-detail">
              <span className="label">Restarts:</span>
              <span className="value">{workerInstance.restartCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaudeServiceManagerComponent;