/**
 * Connection Control Panel Component
 * Manual controls for WebSocket connection management
 */

import React, { useState } from 'react';
import { useConnectionManager } from '../../hooks/useConnectionManager';
import { ConnectionState } from '../../services/connection/types';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Info,
  Wifi,
  WifiOff
} from 'lucide-react';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { toast } from 'sonner';

export interface ConnectionControlPanelProps {
  showAdvancedControls?: boolean;
  showMetrics?: boolean;
  compact?: boolean;
  className?: string;
}

export const ConnectionControlPanel: React.FC<ConnectionControlPanelProps> = ({
  showAdvancedControls = false,
  showMetrics = true,
  compact = false,
  className = ''
}) => {
  const {
    state,
    isConnected,
    isConnecting,
    isReconnecting,
    hasError,
    connect,
    disconnect,
    reconnect,
    metrics,
    health,
    lastError,
    currentAttempt,
    maxAttempts
  } = useConnectionManager();

  const [isManualMode, setIsManualMode] = useState(false);
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);

  const handleConnect = async () => {
    try {
      await connect();
      toast.success('Connection established successfully');
    } catch (error) {
      toast.error(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDisconnect = async (manual = true) => {
    try {
      await disconnect(manual);
      if (manual) {
        toast.info('Disconnected manually');
        setIsManualMode(true);
      }
      setShowConfirmDisconnect(false);
    } catch (error) {
      toast.error(`Disconnect failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReconnect = async () => {
    try {
      setIsManualMode(false);
      await reconnect();
      toast.success('Reconnection initiated');
    } catch (error) {
      toast.error(`Reconnection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getConnectionActions = () => {
    const canConnect = state === ConnectionState.DISCONNECTED || 
                      state === ConnectionState.MANUAL_DISCONNECT || 
                      state === ConnectionState.ERROR;
    
    const canDisconnect = isConnected;
    const canReconnect = !isConnecting && !isConnected;

    return (
      <div className="flex gap-2">
        {canConnect && (
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            variant="default"
            size={compact ? "sm" : "default"}
          >
            <Play className="w-4 h-4 mr-1" />
            Connect
          </Button>
        )}
        
        {canDisconnect && (
          <Button
            onClick={() => setShowConfirmDisconnect(true)}
            variant="outline"
            size={compact ? "sm" : "default"}
          >
            <Square className="w-4 h-4 mr-1" />
            Disconnect
          </Button>
        )}
        
        {canReconnect && (
          <Button
            onClick={handleReconnect}
            disabled={isReconnecting}
            variant="secondary"
            size={compact ? "sm" : "default"}
          >
            <RotateCcw className={`w-4 h-4 mr-1 ${isReconnecting ? 'animate-spin' : ''}`} />
            Reconnect
          </Button>
        )}
      </div>
    );
  };

  const getStatusSummary = () => {
    if (isConnected) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Connected</span>
          {health.latency && (
            <Badge variant="secondary" className="text-xs">
              {Math.round(health.latency)}ms
            </Badge>
          )}
        </div>
      );
    }

    if (isReconnecting) {
      return (
        <div className="flex items-center gap-2 text-amber-600">
          <RotateCcw className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">
            Reconnecting ({currentAttempt}/{maxAttempts})
          </span>
        </div>
      );
    }

    if (hasError && lastError) {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">Error</span>
          <Badge variant="destructive" className="text-xs">
            {lastError.message}
          </Badge>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-gray-500">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">Disconnected</span>
        {isManualMode && (
          <Badge variant="outline" className="text-xs">
            Manual
          </Badge>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <ConnectionStatusIndicator variant="minimal" size="sm" />
        {getConnectionActions()}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Connection Control
          </div>
          {showAdvancedControls && (
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center justify-between">
          <ConnectionStatusIndicator variant="detailed" showLatency />
          {getConnectionActions()}
        </div>

        {/* Connection Summary */}
        <div className="bg-gray-50 rounded-lg p-3">
          {getStatusSummary()}
        </div>

        {/* Metrics Display */}
        {showMetrics && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Success Rate</span>
              <div className="font-medium">
                {metrics.connectionAttempts > 0 
                  ? `${Math.round((metrics.successfulConnections / metrics.connectionAttempts) * 100)}%`
                  : 'N/A'
                }
              </div>
            </div>
            <div>
              <span className="text-gray-600">Uptime</span>
              <div className="font-medium">
                {health.uptime > 0 
                  ? `${Math.round(health.uptime / 1000)}s`
                  : 'N/A'
                }
              </div>
            </div>
            <div>
              <span className="text-gray-600">Messages</span>
              <div className="font-medium">
                {metrics.messagesReceived + metrics.messagesSent}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Quality</span>
              <div className="font-medium capitalize">
                {health.networkQuality}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {hasError && lastError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-red-800">
                  Connection Error
                </div>
                <div className="text-sm text-red-600 mt-1">
                  {lastError.message}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Controls */}
        {showAdvancedControls && (
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Auto-reconnect</span>
              <Badge variant="outline" className="text-xs">
                Enabled
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Health monitoring</span>
              <Badge variant="outline" className="text-xs">
                Active
              </Badge>
            </div>
          </div>
        )}

        {/* Disconnect Confirmation */}
        {showConfirmDisconnect && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Confirm Disconnect
              </span>
            </div>
            <p className="text-sm text-amber-700 mb-3">
              This will manually disconnect the WebSocket connection. Auto-reconnect will be disabled until you manually reconnect.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDisconnect(true)}
              >
                Yes, Disconnect
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConfirmDisconnect(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Simplified quick controls component
export const QuickConnectionControls: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const { isConnected, connect, disconnect, reconnect, state } = useConnectionManager();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ConnectionStatusIndicator variant="minimal" size="sm" />
      
      {!isConnected && state !== ConnectionState.CONNECTING && (
        <Button size="sm" variant="outline" onClick={() => connect()}>
          <Play className="w-3 h-3" />
        </Button>
      )}
      
      {isConnected && (
        <Button size="sm" variant="outline" onClick={() => disconnect(true)}>
          <Square className="w-3 h-3" />
        </Button>
      )}
      
      {state === ConnectionState.ERROR && (
        <Button size="sm" variant="outline" onClick={() => reconnect()}>
          <RotateCcw className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
};