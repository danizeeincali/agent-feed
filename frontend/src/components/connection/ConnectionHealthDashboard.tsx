/**
 * Connection Health Dashboard Component
 * Comprehensive visualization of connection health and metrics
 */

import React, { useState, useEffect } from 'react';
import { useConnectionManager } from '../../hooks/useConnectionManager';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Activity, 
  Zap, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Wifi,
  Timer,
  Target,
  RefreshCw
} from 'lucide-react';

export interface ConnectionHealthDashboardProps {
  showDetailedMetrics?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

export const ConnectionHealthDashboard: React.FC<ConnectionHealthDashboardProps> = ({
  showDetailedMetrics = true,
  autoRefresh = true,
  refreshInterval = 5000,
  className = ''
}) => {
  const { 
    health, 
    metrics, 
    isConnected, 
    state, 
    manager 
  } = useConnectionManager();

  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);

  // Auto-refresh data
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLastUpdate(new Date());
      
      // Update latency history for simple trending
      if (health.latency !== null) {
        setLatencyHistory(prev => {
          const newHistory = [...prev, health.latency!];
          return newHistory.slice(-20); // Keep last 20 readings
        });
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, health.latency]);

  const getHealthScore = (): number => {
    if (!isConnected) return 0;
    
    let score = 100;
    
    // Latency impact
    if (health.latency !== null) {
      if (health.latency > 1000) score -= 40;
      else if (health.latency > 500) score -= 20;
      else if (health.latency > 200) score -= 10;
    }
    
    // Consecutive failures impact
    score -= Math.min(health.consecutiveFailures * 15, 50);
    
    // Connection stability impact
    const totalAttempts = metrics.connectionAttempts;
    if (totalAttempts > 0) {
      const successRate = metrics.successfulConnections / totalAttempts;
      score -= (1 - successRate) * 30;
    }
    
    return Math.max(0, Math.round(score));
  };

  const getHealthScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthScoreVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    if (score >= 40) return 'outline';
    return 'destructive';
  };

  const getLatencyTrend = (): 'up' | 'down' | 'stable' => {
    if (latencyHistory.length < 5) return 'stable';
    
    const recent = latencyHistory.slice(-5);
    const earlier = latencyHistory.slice(-10, -5);
    
    if (earlier.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    
    const threshold = 20; // 20ms threshold
    
    if (recentAvg > earlierAvg + threshold) return 'up';
    if (recentAvg < earlierAvg - threshold) return 'down';
    return 'stable';
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  };

  const healthScore = getHealthScore();
  const latencyTrend = getLatencyTrend();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Connection Health
            </div>
            <Badge 
              variant={getHealthScoreVariant(healthScore)}
              className="font-mono"
            >
              {healthScore}/100
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Status */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                {isConnected ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="text-sm text-gray-600">Status</div>
              <div className="font-medium capitalize">{state.replace('_', ' ')}</div>
            </div>

            {/* Latency */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Zap className="w-5 h-5 text-blue-500" />
                {latencyTrend === 'up' && <TrendingUp className="w-3 h-3 text-red-500 ml-1" />}
                {latencyTrend === 'down' && <TrendingDown className="w-3 h-3 text-green-500 ml-1" />}
              </div>
              <div className="text-sm text-gray-600">Latency</div>
              <div className="font-medium">
                {health.latency ? `${Math.round(health.latency)}ms` : 'N/A'}
              </div>
            </div>

            {/* Quality */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Wifi className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-sm text-gray-600">Quality</div>
              <div className="font-medium capitalize">{health.networkQuality}</div>
            </div>

            {/* Uptime */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Clock className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-sm text-gray-600">Uptime</div>
              <div className="font-medium">{formatDuration(health.uptime)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      {showDetailedMetrics && (
        <Tabs value="connection" onValueChange={() => {}} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Connection Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Total Attempts</div>
                    <div className="text-2xl font-bold">{metrics.connectionAttempts}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Successful</div>
                    <div className="text-2xl font-bold text-green-600">
                      {metrics.successfulConnections}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Failed</div>
                    <div className="text-2xl font-bold text-red-600">
                      {metrics.failedConnections}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Reconnections</div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {metrics.reconnectionAttempts}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                    <div className="text-2xl font-bold">
                      {metrics.connectionAttempts > 0 
                        ? `${Math.round((metrics.successfulConnections / metrics.connectionAttempts) * 100)}%`
                        : 'N/A'
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Downtime</div>
                    <div className="text-2xl font-bold text-red-600">
                      {formatDuration(metrics.totalDowntime)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Average Latency</div>
                    <div className="text-2xl font-bold">
                      {metrics.averageLatency > 0 
                        ? `${Math.round(metrics.averageLatency)}ms`
                        : 'N/A'
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Current Latency</div>
                    <div className="text-2xl font-bold">
                      {health.latency ? `${Math.round(health.latency)}ms` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Health Failures</div>
                    <div className="text-2xl font-bold">
                      {health.consecutiveFailures}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Last Ping</div>
                    <div className="text-sm font-medium">
                      {health.lastPing 
                        ? health.lastPing.toLocaleTimeString()
                        : 'Never'
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Connection Time</div>
                    <div className="text-sm font-medium">
                      {metrics.lastConnectionTime 
                        ? metrics.lastConnectionTime.toLocaleTimeString()
                        : 'Never'
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Last Disconnect</div>
                    <div className="text-sm font-medium">
                      {metrics.lastDisconnectionTime 
                        ? metrics.lastDisconnectionTime.toLocaleTimeString()
                        : 'Never'
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="traffic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Traffic Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Messages Sent</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {metrics.messagesSent}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Messages Received</div>
                    <div className="text-2xl font-bold text-green-600">
                      {metrics.messagesReceived}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Bytes Sent</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatBytes(metrics.bytesSent)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Bytes Received</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatBytes(metrics.bytesReceived)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLastUpdate(new Date())}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};