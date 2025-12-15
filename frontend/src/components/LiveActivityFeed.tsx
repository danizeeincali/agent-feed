import React, { useState, useEffect, useRef } from 'react';
import { useSSE } from '../hooks/useSSE';
import {
  Activity,
  Wrench,
  Bot,
  MessageSquare,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Filter
} from 'lucide-react';

interface SessionMetrics {
  session_id?: string;
  request_count?: number;
  total_tokens?: number;
  total_cost?: number;
}

export function LiveActivityFeed() {
  const [filter, setFilter] = useState('all'); // all, high, agent, tool
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const { connected, events: sseEvents, error, reconnect } = useSSE('/api/streaming-ticker/stream');

  useEffect(() => {
    if (sseEvents.length > 0) {
      const latestEvent = sseEvents[0];

      // Update session metrics if applicable
      if (latestEvent.type === 'session_metrics') {
        setSessionMetrics(latestEvent.data);
      }
    }
  }, [sseEvents]);

  const filteredEvents = sseEvents.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'high') return event.data?.priority === 'high';
    if (filter === 'agent') return event.type?.includes('agent');
    if (filter === 'tool') return event.type === 'tool_execution';
    return true;
  });

  return (
    <div className="live-activity-feed h-full flex flex-col bg-gray-900 rounded-lg shadow-lg">
      {/* Header */}
      <div className="feed-header flex justify-between items-center p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <Activity className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-semibold text-gray-100">Live Activity</h3>
        </div>
        <div className="connection-status">
          <span className={`flex items-center space-x-2 text-sm ${connected ? 'text-green-400' : 'text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-200">{error}</span>
          </div>
          <button
            onClick={reconnect}
            className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="feed-filters flex gap-2 p-4 border-b border-gray-700">
        <Filter className="w-5 h-5 text-gray-400 mr-2" />
        {['all', 'high', 'agent', 'tool'].map((filterType) => (
          <button
            key={filterType}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              filter === filterType
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => setFilter(filterType)}
          >
            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
          </button>
        ))}
      </div>

      {/* Session Metrics */}
      {sessionMetrics.session_id && (
        <div className="session-metrics grid grid-cols-4 gap-4 p-4 bg-gray-800/50 border-b border-gray-700">
          <div className="metric flex flex-col">
            <span className="label text-xs text-gray-400 uppercase tracking-wider mb-1">Session</span>
            <span className="value text-sm font-mono text-gray-200 truncate">
              {sessionMetrics.session_id?.substring(0, 8)}...
            </span>
          </div>
          <div className="metric flex flex-col">
            <span className="label text-xs text-gray-400 uppercase tracking-wider mb-1">Requests</span>
            <span className="value text-lg font-semibold text-blue-400">
              {sessionMetrics.request_count || 0}
            </span>
          </div>
          <div className="metric flex flex-col">
            <span className="label text-xs text-gray-400 uppercase tracking-wider mb-1">Tokens</span>
            <span className="value text-lg font-semibold text-purple-400">
              {(sessionMetrics.total_tokens || 0).toLocaleString()}
            </span>
          </div>
          <div className="metric flex flex-col">
            <span className="label text-xs text-gray-400 uppercase tracking-wider mb-1">Cost</span>
            <span className="value text-lg font-semibold text-green-400">
              ${(sessionMetrics.total_cost || 0).toFixed(4)}
            </span>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="feed-events flex-1 overflow-y-auto p-4 space-y-2" ref={scrollRef}>
        {filteredEvents.length === 0 && (
          <div className="no-events flex flex-col items-center justify-center h-full text-gray-500">
            <Zap className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">No activity yet. Waiting for events...</p>
          </div>
        )}

        {filteredEvents.map((event, index) => (
          <ActivityEventItem key={`${event.timestamp}-${index}`} event={event} />
        ))}
      </div>
    </div>
  );
}

interface ActivityEventItemProps {
  event: {
    type: string;
    data: any;
    timestamp: string;
  };
}

function ActivityEventItem({ event }: ActivityEventItemProps) {
  const getEventIcon = (type: string) => {
    if (type?.includes('agent')) return <Bot className="w-5 h-5 text-blue-400" />;
    if (type === 'tool_execution') return <Wrench className="w-5 h-5 text-orange-400" />;
    if (type?.includes('prompt')) return <MessageSquare className="w-5 h-5 text-purple-400" />;
    if (type?.includes('session')) return <BarChart3 className="w-5 h-5 text-green-400" />;
    return <Activity className="w-5 h-5 text-gray-400" />;
  };

  const getStatusColor = (status?: string) => {
    if (status === 'success') return 'text-green-400';
    if (status === 'failed') return 'text-red-400';
    if (status === 'running') return 'text-blue-400';
    return 'text-gray-400';
  };

  const getPriorityBorderColor = (priority?: string) => {
    if (priority === 'high' || priority === 'critical') return 'border-l-orange-500';
    if (priority === 'medium') return 'border-l-yellow-500';
    return 'border-l-gray-600';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className={`activity-event bg-gray-800 border-l-4 ${getPriorityBorderColor(event.data?.priority)} rounded-r-lg p-3 hover:bg-gray-750 transition-all animate-slideIn`}>
      <div className="flex gap-3">
        <div className="event-icon flex-shrink-0 mt-1">
          {getEventIcon(event.type)}
        </div>

        <div className="event-content flex-1 min-w-0">
          <div className="event-main flex items-start justify-between gap-2 mb-2">
            <div className="flex flex-wrap items-center gap-2">
              {event.type === 'tool_execution' && (
                <>
                  <span className="tool-name text-sm font-semibold text-blue-300">
                    {event.data?.tool || 'Unknown Tool'}
                  </span>
                  <span className="action text-xs text-gray-400 font-mono">
                    {event.data?.action || event.type}
                  </span>
                  {event.data?.duration && (
                    <span className="duration text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                      {event.data.duration}ms
                    </span>
                  )}
                  {event.data?.status && (
                    <span className={`status text-xs font-semibold ${getStatusColor(event.data.status)}`}>
                      {event.data.status === 'success' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                      {event.data.status === 'failed' && <AlertCircle className="w-3 h-3 inline mr-1" />}
                      {event.data.status}
                    </span>
                  )}
                </>
              )}

              {event.type?.includes('agent') && (
                <>
                  <span className="agent-type text-sm font-semibold text-purple-300">
                    {event.data?.agent_type || 'agent'}
                  </span>
                  <span className="action text-xs text-gray-400 font-mono">
                    {event.data?.action || event.type}
                  </span>
                  {event.data?.tokens_used && (
                    <span className="tokens text-xs bg-purple-900/40 text-purple-200 px-2 py-0.5 rounded">
                      {event.data.tokens_used} tokens
                    </span>
                  )}
                  {event.data?.cost && (
                    <span className="cost text-xs bg-green-900/40 text-green-200 px-2 py-0.5 rounded">
                      ${event.data.cost.toFixed(4)}
                    </span>
                  )}
                </>
              )}

              {!event.type?.includes('agent') && event.type !== 'tool_execution' && (
                <>
                  <span className="event-type text-sm font-semibold text-gray-300">
                    {event.type}
                  </span>
                  <span className="action text-xs text-gray-400">
                    {event.data?.message || event.data?.action || 'No details'}
                  </span>
                </>
              )}
            </div>

            <span className="event-time text-xs text-gray-500 font-mono whitespace-nowrap flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimestamp(event.data?.timestamp || event.timestamp)}
            </span>
          </div>

          {event.data?.error && (
            <div className="event-error text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded font-mono mb-2">
              Error: {event.data.error}
            </div>
          )}

          {event.data?.file_path && (
            <div className="event-meta text-xs text-gray-400 flex items-center gap-1">
              <span className="opacity-60">📁</span>
              <span className="font-mono truncate">{event.data.file_path}</span>
            </div>
          )}

          {event.data?.progress && (
            <div className="event-progress mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="progress-text text-xs text-gray-400">
                  {event.data.progress.current_step}/{event.data.progress.total_steps}
                  ({event.data.progress.percentage}%)
                </span>
              </div>
              <div className="progress-bar h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="progress-fill h-full bg-blue-500 transition-all duration-300 rounded-full"
                  style={{ width: `${event.data.progress.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LiveActivityFeed;
