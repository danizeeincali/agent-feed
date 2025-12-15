import React, { useState, useMemo } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import type { Alert } from '../../services/MonitoringApiService';
import AlertCard from './AlertCard';

interface AlertsPanelProps {
  alerts: Alert[];
  loading?: boolean;
  onAcknowledge: (alertId: string) => Promise<void>;
}

type SeverityFilter = 'all' | Alert['severity'];

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, loading = false, onAcknowledge }) => {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const alertsPerPage = 10;

  // Calculate alert counts by severity
  const alertCounts = useMemo(() => {
    const counts = {
      total: alerts.length,
      critical: 0,
      warning: 0,
      info: 0,
    };

    alerts.forEach(alert => {
      if (alert.severity === 'critical') counts.critical++;
      else if (alert.severity === 'warning') counts.warning++;
      else if (alert.severity === 'info') counts.info++;
    });

    return counts;
  }, [alerts]);

  // Filter and sort alerts
  const filteredAlerts = useMemo(() => {
    let filtered = [...alerts];

    // Filter by severity
    if (severityFilter !== 'all') {
      filtered = filtered.filter(alert => alert.severity === severityFilter);
    }

    // Filter by acknowledged status
    if (!showAcknowledged) {
      filtered = filtered.filter(alert => !alert.acknowledged);
    }

    // Sort by severity (critical > warning > info) then by timestamp (newest first)
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    filtered.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return filtered;
  }, [alerts, severityFilter, showAcknowledged]);

  // Pagination
  const totalPages = Math.ceil(filteredAlerts.length / alertsPerPage);
  const paginatedAlerts = filteredAlerts.slice(
    (currentPage - 1) * alertsPerPage,
    currentPage * alertsPerPage
  );

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [severityFilter, showAcknowledged]);

  const getSeverityButtonClass = (severity: SeverityFilter, count?: number) => {
    const isActive = severityFilter === severity;
    const baseClass = `
      inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
      transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800
    `;

    if (isActive) {
      if (severity === 'critical') {
        return `${baseClass} bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-2 border-red-300 dark:border-red-800`;
      } else if (severity === 'warning') {
        return `${baseClass} bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-2 border-yellow-300 dark:border-yellow-800`;
      } else if (severity === 'info') {
        return `${baseClass} bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-2 border-blue-300 dark:border-blue-800`;
      } else {
        return `${baseClass} bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600`;
      }
    }

    return `${baseClass} bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700`;
  };

  const renderSkeletons = () => (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="border rounded-lg p-4 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 animate-pulse"
        >
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4" />
              <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full" />
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmptyState = () => {
    if (alerts.length === 0) {
      return (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-500 dark:text-green-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            All systems operating normally
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No alerts detected. Everything is running smoothly.
          </p>
        </div>
      );
    }

    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No alerts match filters
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Try adjusting your filters to see more alerts.
        </p>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
      {/* Header with alert counts */}
      <div className="border-b border-gray-300 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            System Alerts
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Total: <span className="font-semibold text-gray-900 dark:text-gray-100">{alertCounts.total}</span>
            </span>
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              <span className="font-semibold">{alertCounts.critical}</span>
            </span>
            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              <span className="font-semibold">{alertCounts.warning}</span>
            </span>
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <Info className="w-4 h-4" aria-hidden="true" />
              <span className="font-semibold">{alertCounts.info}</span>
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by:</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSeverityFilter('all')}
              className={getSeverityButtonClass('all')}
              aria-pressed={severityFilter === 'all'}
            >
              All
            </button>
            <button
              onClick={() => setSeverityFilter('critical')}
              className={getSeverityButtonClass('critical', alertCounts.critical)}
              aria-pressed={severityFilter === 'critical'}
            >
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              Critical ({alertCounts.critical})
            </button>
            <button
              onClick={() => setSeverityFilter('warning')}
              className={getSeverityButtonClass('warning', alertCounts.warning)}
              aria-pressed={severityFilter === 'warning'}
            >
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              Warning ({alertCounts.warning})
            </button>
            <button
              onClick={() => setSeverityFilter('info')}
              className={getSeverityButtonClass('info', alertCounts.info)}
              aria-pressed={severityFilter === 'info'}
            >
              <Info className="w-4 h-4" aria-hidden="true" />
              Info ({alertCounts.info})
            </button>
          </div>
          <div className="ml-auto">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showAcknowledged}
                onChange={(e) => setShowAcknowledged(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
              />
              <span>Show Acknowledged</span>
            </label>
          </div>
        </div>
      </div>

      {/* Alert list */}
      <div className="p-4">
        {loading ? (
          renderSkeletons()
        ) : filteredAlerts.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <div className="space-y-3" role="list" aria-label="System alerts">
              {paginatedAlerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={onAcknowledge}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-300 dark:border-gray-700 pt-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((currentPage - 1) * alertsPerPage) + 1} to {Math.min(currentPage * alertsPerPage, filteredAlerts.length)} of {filteredAlerts.length} alerts
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`
                      px-3 py-1 rounded text-sm font-medium
                      ${currentPage === 1
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800
                    `}
                    aria-label="Previous page"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`
                      px-3 py-1 rounded text-sm font-medium
                      ${currentPage === totalPages
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800
                    `}
                    aria-label="Next page"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;
