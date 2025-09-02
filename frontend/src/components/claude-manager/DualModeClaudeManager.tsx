/**
 * DualModeClaudeManager - Production-Ready Unified Interface
 * 
 * This component combines both ClaudeServiceManager (global monitoring) and
 * ClaudeInstanceManager (interactive control) into a unified production interface.
 * Designed for seamless feed integration and always-on operations.
 */

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import ClaudeServiceManagerComponent from './ClaudeServiceManagerComponent';
import ClaudeInstanceManagerComponent from './ClaudeInstanceManagerComponent';
import { FeedIntegrationService, FeedWorkerStatus, createProductionFeedIntegration } from '../../services/FeedIntegrationService';
import './claude-manager.css';

interface DualModeClaudeManagerProps {
  apiUrl?: string;
  websocketUrl?: string;
  enableFeedIntegration?: boolean;
}

export const DualModeClaudeManager: React.FC<DualModeClaudeManagerProps> = ({
  apiUrl = 'http://localhost:3000',
  websocketUrl,
  enableFeedIntegration = true
}) => {
  const [activeTab, setActiveTab] = useState<'global' | 'interactive' | 'feed'>('global');
  const [feedIntegration, setFeedIntegration] = useState<FeedIntegrationService | null>(null);
  const [feedWorkerStatus, setFeedWorkerStatus] = useState<FeedWorkerStatus | null>(null);
  const [isInitializing, setIsInitializing] = useState(false); // Changed from true
  const [isInitialized, setIsInitialized] = useState(false); // Track initialization state
  const [error, setError] = useState<string | null>(null);

  // User-controlled feed integration initialization
  const initializeFeedIntegration = async () => {
    if (!enableFeedIntegration || isInitialized) {
      return;
    }

    setIsInitializing(true);
    try {
      console.log('[DualModeClaudeManager] User requested feed integration initialization');
      
      const feedService = createProductionFeedIntegration(apiUrl);
      await feedService.initialize();
      
      setFeedIntegration(feedService);
      setIsInitialized(true);
        
        // Setup feed service event listeners
        feedService.on('feed:integration:ready', (data: any) => {
          console.log('Feed integration ready:', data);
          setError(null);
        });

        feedService.on('feed:worker:failed', (data: any) => {
          console.error('Feed worker failed:', data);
          setError(`Feed worker failed: ${data.error}`);
        });

        feedService.on('feed:worker:recovered', (data: any) => {
          console.log('Feed worker recovered:', data);
          setError(null);
        });

        // Start monitoring feed worker status
        const updateFeedStatus = async () => {
          try {
            const status = await feedService.getWorkerStatus();
            setFeedWorkerStatus(status);
          } catch (err) {
            console.error('Failed to get feed worker status:', err);
          }
        };

        updateFeedStatus();
        const statusInterval = setInterval(updateFeedStatus, 10000);
      
        // Store cleanup reference for component unmount
        return () => {
          clearInterval(statusInterval);
          feedService.cleanup();
        };
    } catch (err) {
      console.error('[DualModeClaudeManager] Feed integration failed:', err);
      setError(`Feed integration failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsInitializing(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (feedIntegration) {
        console.log('[DualModeClaudeManager] Cleaning up feed integration on unmount');
        feedIntegration.cleanup();
      }
    };
  }, [feedIntegration]);

  if (isInitializing) {
    return (
      <div className="dual-mode-manager initializing">
        <div className="initialization-status">
          <h2>Initializing Feed Integration</h2>
          <p>Setting up feed integration service...</p>
          <div className="loading-indicator">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dual-mode-claude-manager">
      <div className="manager-header">
        <h1>Claude Management System</h1>
        <div className="system-status">
          {error && (
            <div className="error-banner">
              {error}
              <button onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}
          
          {enableFeedIntegration && feedWorkerStatus && (
            <div className={`feed-status ${feedWorkerStatus.status}`}>
              <span className="label">Feed Worker:</span>
              <span className={`status status-${feedWorkerStatus.status}`}>
                {feedWorkerStatus.status}
              </span>
              <span className="instance-id">
                {feedWorkerStatus.instanceId.slice(0, 8)}...
              </span>
            </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="tabs-root">
        <TabsList className="tabs-list">
          <TabsTrigger value="global" className="tabs-trigger">
            Global Monitor
          </TabsTrigger>
          <TabsTrigger value="interactive" className="tabs-trigger">
            Interactive Control
          </TabsTrigger>
          {enableFeedIntegration && (
            <TabsTrigger value="feed" className="tabs-trigger">
              Feed Integration
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="global" className="tabs-content">
          <div className="mode-description">
            <h3>Global Claude Instance Monitoring</h3>
            <p>
              API-only monitoring and management of all Claude instances. 
              Create, monitor, and manage always-on worker instances for feed processing.
            </p>
          </div>
          <ClaudeServiceManagerComponent apiUrl={apiUrl} />
        </TabsContent>

        <TabsContent value="interactive" className="tabs-content">
          <div className="mode-description">
            <h3>Interactive Claude Instance Control</h3>
            <p>
              Real-time WebSocket-based interaction with individual Claude instances.
              Connect to running instances for terminal access and command execution.
            </p>
          </div>
          <ClaudeInstanceManagerComponent 
            apiUrl={apiUrl}
            websocketUrl={websocketUrl}
            autoConnect={false}
          />
        </TabsContent>

        {enableFeedIntegration && (
          <TabsContent value="feed" className="tabs-content">
            <div className="mode-description">
              <h3>Feed Integration System</h3>
              <p>
                Always-on worker instance management for continuous feed processing.
                Monitor feed processing metrics and worker health.
              </p>
            </div>
            
            <div className="feed-integration-dashboard">
              {!isInitialized ? (
                <div className="feed-integration-setup">
                  <h4>Feed Integration Setup</h4>
                  <p>
                    Initialize the feed integration system to monitor and manage
                    always-on Claude worker instances for continuous feed processing.
                  </p>
                  <button 
                    className={`initialize-button ${isInitializing ? 'loading' : ''}`}
                    onClick={initializeFeedIntegration}
                    disabled={isInitializing}
                  >
                    {isInitializing ? (
                      <>
                        <span className="spinner"></span>
                        Initializing Feed Integration...
                      </>
                    ) : (
                      'Initialize Feed Integration'
                    )}
                  </button>
                </div>
              ) : feedWorkerStatus ? (
                <>
                  <div className="worker-overview">
                    <h4>Worker Instance Status</h4>
                    <div className="worker-stats">
                      <div className="stat">
                        <span className="label">Instance ID:</span>
                        <span className="value">{feedWorkerStatus.instanceId}</span>
                      </div>
                      <div className="stat">
                        <span className="label">Status:</span>
                        <span className={`value status-${feedWorkerStatus.status}`}>
                          {feedWorkerStatus.status}
                        </span>
                      </div>
                      <div className="stat">
                        <span className="label">Current Feeds:</span>
                        <span className="value">
                          {feedWorkerStatus.currentFeeds} / {feedWorkerStatus.maxFeeds}
                        </span>
                      </div>
                      <div className="stat">
                        <span className="label">Error Count:</span>
                        <span className="value">{feedWorkerStatus.errorCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="feed-metrics">
                    <h4>Processing Metrics</h4>
                    <div className="metrics-grid">
                      <div className="metric">
                        <span className="label">Total Processed:</span>
                        <span className="value">{feedWorkerStatus.metrics.totalFeedsProcessed}</span>
                      </div>
                      <div className="metric">
                        <span className="label">Success Rate:</span>
                        <span className="value">
                          {feedWorkerStatus.metrics.totalFeedsProcessed > 0 
                            ? ((feedWorkerStatus.metrics.successfulFeeds / feedWorkerStatus.metrics.totalFeedsProcessed) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                      <div className="metric">
                        <span className="label">Avg Processing Time:</span>
                        <span className="value">
                          {feedWorkerStatus.metrics.averageProcessingTime.toFixed(0)}ms
                        </span>
                      </div>
                      <div className="metric">
                        <span className="label">Current Load:</span>
                        <span className="value">{feedWorkerStatus.metrics.currentLoad.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="feed-integration-unavailable">
                  <h4>Feed Integration Unavailable</h4>
                  <p>
                    Feed integration system is initialized but no worker status available. 
                    Ensure a worker instance is created in the Global Monitor tab.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default DualModeClaudeManager;