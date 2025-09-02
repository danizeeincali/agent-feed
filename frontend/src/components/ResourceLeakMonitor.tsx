/**
 * Resource Leak Monitor Component
 * Visual dashboard for monitoring resource leaks in real-time
 */

import React, { useState, useEffect } from 'react';
import { resourceLeakDetector, ResourceLeakPattern } from '../nld/detection/ResourceLeakDetector';
import { resourceLeakPatternAnalyzer, ResourceLeakAnalysis } from '../nld/patterns/ResourceLeakPatterns';
import { useResourceLeakPrevention } from '../hooks/useResourceLeakPrevention';

interface ResourceLeakMonitorProps {
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const ResourceLeakMonitor: React.FC<ResourceLeakMonitorProps> = ({
  showDetails = false,
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const [leakPatterns, setLeakPatterns] = useState<ResourceLeakPattern[]>([]);
  const [analysis, setAnalysis] = useState<ResourceLeakAnalysis | null>(null);
  const [leakScore, setLeakScore] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const resourceTracker = useResourceLeakPrevention({ 
    componentName: 'ResourceLeakMonitor',
    alertOnLeaks: false // Don't alert for the monitor itself
  });

  // Update data periodically
  useEffect(() => {
    const updateData = () => {
      const patterns = resourceLeakDetector.getLeakPatterns();
      setLeakPatterns(patterns);
      setLeakScore(resourceLeakDetector.getLeakScore());

      // Analyze patterns if we have any
      if (patterns.length > 0) {
        patterns.forEach(pattern => {
          resourceLeakPatternAnalyzer.analyzePattern(pattern);
        });
        setAnalysis(resourceLeakPatternAnalyzer.analyzeLeakTrends());
      }
    };

    // Initial update
    updateData();

    // Set up periodic updates if auto-refresh is enabled
    if (autoRefresh) {
      const timerId = setInterval(updateData, refreshInterval);
      resourceTracker.registerTimer(timerId, 'interval');
    }
  }, [autoRefresh, refreshInterval, resourceTracker]);

  const getScoreColor = (score: number): string => {
    if (score < 0.3) return '#22c55e'; // Green
    if (score < 0.6) return '#eab308'; // Yellow
    if (score < 0.8) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getScoreText = (score: number): string => {
    if (score < 0.3) return 'Good';
    if (score < 0.6) return 'Warning';
    if (score < 0.8) return 'High';
    return 'Critical';
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getPatternIcon = (type: ResourceLeakPattern['type']): string => {
    switch (type) {
      case 'component_mount_leak': return '🏗️';
      case 'navigation_accumulation': return '🧭';
      case 'event_listener_leak': return '👂';
      case 'timer_leak': return '⏰';
      case 'api_subscription_leak': return '📡';
      default: return '⚠️';
    }
  };

  if (leakScore === 0 && leakPatterns.length === 0) {
    return (
      <div className="resource-leak-monitor-clean">
        <div style={{ 
          padding: '8px 12px', 
          backgroundColor: '#f0fdf4', 
          border: '1px solid #22c55e',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#166534'
        }}>
          ✅ No resource leaks detected
        </div>
      </div>
    );
  }

  return (
    <div className="resource-leak-monitor" style={{ 
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: '#ffffff'
    }}>
      {/* Header */}
      <div 
        style={{ 
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          backgroundColor: leakScore > 0.6 ? '#fef2f2' : '#f8fafc'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%',
            backgroundColor: getScoreColor(leakScore),
            display: 'inline-block'
          }} />
          <span style={{ fontWeight: '600' }}>
            Resource Leak Monitor
          </span>
          <span style={{ 
            color: '#6b7280',
            backgroundColor: '#f3f4f6',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            {getScoreText(leakScore)}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {leakPatterns.length > 0 && (
            <span style={{ 
              color: '#dc2626',
              fontWeight: '600'
            }}>
              {leakPatterns.length} leak{leakPatterns.length !== 1 ? 's' : ''}
            </span>
          )}
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ padding: '16px' }}>
          {/* Leak Score */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '12px', 
              color: '#6b7280', 
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Leak Score
            </div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: '700',
              color: getScoreColor(leakScore)
            }}>
              {(leakScore * 100).toFixed(1)}%
            </div>
            <div style={{ 
              width: '100%',
              height: '6px',
              backgroundColor: '#f3f4f6',
              borderRadius: '3px',
              overflow: 'hidden',
              marginTop: '8px'
            }}>
              <div style={{
                width: `${leakScore * 100}%`,
                height: '100%',
                backgroundColor: getScoreColor(leakScore),
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Recent Patterns */}
          {leakPatterns.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                fontSize: '12px', 
                color: '#6b7280', 
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Recent Leaks ({leakPatterns.length})
              </div>
              
              <div style={{ 
                maxHeight: showDetails ? 'none' : '200px',
                overflowY: showDetails ? 'visible' : 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '6px'
              }}>
                {leakPatterns.slice(-5).reverse().map((pattern, index) => (
                  <div 
                    key={pattern.id}
                    style={{ 
                      padding: '12px',
                      borderBottom: index < Math.min(leakPatterns.length, 5) - 1 ? '1px solid #f3f4f6' : 'none',
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '16px' }}>
                            {getPatternIcon(pattern.type)}
                          </span>
                          <span style={{ fontWeight: '600', color: '#1f2937' }}>
                            {pattern.component}
                          </span>
                          <span style={{ 
                            fontSize: '12px',
                            color: '#6b7280',
                            backgroundColor: '#f3f4f6',
                            padding: '1px 4px',
                            borderRadius: '3px'
                          }}>
                            {pattern.type.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                          Source: {pattern.leakSource}
                        </div>
                        
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          {formatTimestamp(pattern.detectionTime)}
                        </div>
                      </div>
                      
                      <div style={{ 
                        textAlign: 'right',
                        minWidth: '60px'
                      }}>
                        <div style={{ 
                          fontSize: '18px', 
                          fontWeight: '700',
                          color: pattern.resourceCount > 10 ? '#dc2626' : '#f59e0b'
                        }}>
                          {pattern.resourceCount}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                          resources
                        </div>
                      </div>
                    </div>
                    
                    {showDetails && pattern.navigationPath && (
                      <div style={{ 
                        marginTop: '8px',
                        fontSize: '12px',
                        color: '#6b7280',
                        backgroundColor: '#f9fafb',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        fontFamily: 'monospace'
                      }}>
                        Navigation: {pattern.navigationPath}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analysis Summary */}
          {analysis && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                fontSize: '12px', 
                color: '#6b7280', 
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Analysis Summary
              </div>
              
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '12px'
              }}>
                <div style={{ 
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Prevention Rate
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#059669' }}>
                    {(analysis.preventionSuccess.successRate * 100).toFixed(0)}%
                  </div>
                </div>
                
                <div style={{ 
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Top Leak Source
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                    {analysis.commonLeakSources[0]?.source.replace('_', ' ') || 'None'}
                  </div>
                </div>
                
                <div style={{ 
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Recommendations
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#3b82f6' }}>
                    {analysis.recommendations.length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ 
            display: 'flex', 
            gap: '8px',
            paddingTop: '12px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              onClick={() => {
                resourceLeakDetector.clearPatterns();
                resourceLeakPatternAnalyzer.clearPatterns();
                setLeakPatterns([]);
                setAnalysis(null);
                setLeakScore(0);
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: '#ffffff',
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              Clear History
            </button>
            
            <button
              onClick={() => {
                const data = resourceLeakDetector.exportLeakData();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `resource-leak-data-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: '1px solid #3b82f6',
                borderRadius: '4px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              Export Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
};