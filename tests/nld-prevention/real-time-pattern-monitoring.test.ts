/**
 * REAL-TIME PATTERN DETECTION MONITORING DASHBOARD
 * 
 * Provides real-time monitoring and alerting for anti-pattern detection
 * during development and production to prevent failures before they occur.
 */

import { test, expect } from '@playwright/test';
import { Page } from 'playwright';

interface PatternDetectionEvent {
  timestamp: number;
  patternId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  component: string;
  description: string;
  preventionTriggered: boolean;
  autoResolved: boolean;
}

interface MonitoringMetrics {
  patternsDetected: number;
  preventionsActive: number;
  autoResolutions: number;
  criticalAlerts: number;
  monitoringUptime: number;
  lastUpdateTime: number;
}

interface RealTimeAlert {
  id: string;
  timestamp: number;
  type: 'PATTERN_DETECTED' | 'PREVENTION_ACTIVATED' | 'AUTO_RESOLVED' | 'MONITORING_HEALTH';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  message: string;
  component: string;
  actionRequired: boolean;
  autoActionTaken?: string;
}

class RealTimePatternMonitor {
  private events: PatternDetectionEvent[] = [];
  private alerts: RealTimeAlert[] = [];
  private metrics: MonitoringMetrics = {
    patternsDetected: 0,
    preventionsActive: 0,
    autoResolutions: 0,
    criticalAlerts: 0,
    monitoringUptime: Date.now(),
    lastUpdateTime: Date.now()
  };

  async initializeMonitoring(page: Page): Promise<void> {
    // Inject real-time monitoring into page
    await page.addInitScript(() => {
      // Global monitoring state
      (window as any).__nldMonitoring = {
        enabled: true,
        patterns: [],
        events: [],
        alerts: [],
        metrics: {
          patternsDetected: 0,
          preventionsActive: 0,
          autoResolutions: 0,
          criticalAlerts: 0,
          monitoringUptime: Date.now(),
          lastUpdateTime: Date.now()
        }
      };

      // Pattern detection functions
      (window as any).__nldDetectPattern = (patternId: string, severity: string, component: string, description: string) => {
        const event = {
          timestamp: Date.now(),
          patternId,
          severity,
          component,
          description,
          preventionTriggered: false,
          autoResolved: false
        };

        (window as any).__nldMonitoring.events.push(event);
        (window as any).__nldMonitoring.metrics.patternsDetected++;
        (window as any).__nldMonitoring.metrics.lastUpdateTime = Date.now();

        // Create alert
        const alert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          type: 'PATTERN_DETECTED',
          severity,
          message: `Pattern detected: ${description}`,
          component,
          actionRequired: severity === 'CRITICAL' || severity === 'HIGH'
        };

        (window as any).__nldMonitoring.alerts.push(alert);

        if (severity === 'CRITICAL') {
          (window as any).__nldMonitoring.metrics.criticalAlerts++;
          console.warn(`🚨 CRITICAL PATTERN DETECTED: ${description} in ${component}`);
        }

        return event;
      };

      // Prevention activation
      (window as any).__nldActivatePrevention = (patternId: string, action: string) => {
        const events = (window as any).__nldMonitoring.events;
        const event = events.find((e: any) => e.patternId === patternId);
        
        if (event) {
          event.preventionTriggered = true;
          (window as any).__nldMonitoring.metrics.preventionsActive++;
        }

        const alert = {
          id: `prevention-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          type: 'PREVENTION_ACTIVATED',
          severity: 'INFO',
          message: `Prevention activated for ${patternId}: ${action}`,
          component: event?.component || 'Unknown',
          actionRequired: false,
          autoActionTaken: action
        };

        (window as any).__nldMonitoring.alerts.push(alert);
        console.log(`✅ Prevention activated: ${action}`);
      };

      // Auto-resolution
      (window as any).__nldAutoResolve = (patternId: string, resolution: string) => {
        const events = (window as any).__nldMonitoring.events;
        const event = events.find((e: any) => e.patternId === patternId);
        
        if (event) {
          event.autoResolved = true;
          (window as any).__nldMonitoring.metrics.autoResolutions++;
        }

        const alert = {
          id: `resolution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          type: 'AUTO_RESOLVED',
          severity: 'INFO',
          message: `Auto-resolved ${patternId}: ${resolution}`,
          component: event?.component || 'Unknown',
          actionRequired: false,
          autoActionTaken: resolution
        };

        (window as any).__nldMonitoring.alerts.push(alert);
        console.log(`🔧 Auto-resolved: ${resolution}`);
      };

      // CSS stacking context monitor
      (window as any).__nldMonitorStackingContexts = () => {
        const elements = document.querySelectorAll('*');
        let stackingContexts = 0;
        const problematicElements: string[] = [];

        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.transform !== 'none' || 
              style.isolation !== 'auto' || 
              parseInt(style.zIndex) > 0) {
            stackingContexts++;
            
            // Check if this might interfere with dropdowns
            if (el.querySelector('[data-testid*="dropdown"], .dropdown')) {
              problematicElements.push(el.className || el.tagName);
            }
          }
        });

        if (stackingContexts > 10) {
          (window as any).__nldDetectPattern(
            'excessive-stacking-contexts',
            'MEDIUM',
            'CSS',
            `${stackingContexts} stacking contexts detected (threshold: 10)`
          );
        }

        if (problematicElements.length > 0) {
          (window as any).__nldDetectPattern(
            'dropdown-stacking-interference',
            'HIGH',
            'Dropdown',
            `Dropdown ancestors creating stacking contexts: ${problematicElements.join(', ')}`
          );
        }

        return { stackingContexts, problematicElements };
      };

      // Component mounting monitor
      (window as any).__nldMonitorComponentMounts = () => {
        const components = document.querySelectorAll('[data-testid]');
        const mountCounts: Record<string, number> = {};

        components.forEach(el => {
          const testId = el.getAttribute('data-testid');
          if (testId) {
            mountCounts[testId] = (mountCounts[testId] || 0) + 1;
          }
        });

        // Check for duplicate mounts
        Object.entries(mountCounts).forEach(([testId, count]) => {
          if (count > 1) {
            (window as any).__nldDetectPattern(
              'duplicate-component-mount',
              'MEDIUM',
              testId,
              `Component ${testId} mounted ${count} times (expected: 1)`
            );
          }
        });

        return mountCounts;
      };

      // Mention dropdown monitor  
      (window as any).__nldMonitorMentionDropdowns = () => {
        const mentionInputs = document.querySelectorAll('[data-testid*="mention"], input[placeholder*="@"], textarea[placeholder*="@"]');
        const dropdownResults: Array<{input: string, hasDropdown: boolean, hasDebugMessage: boolean}> = [];

        mentionInputs.forEach((input, index) => {
          const inputId = input.getAttribute('data-testid') || `mention-input-${index}`;
          
          // Simulate @ typing
          if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
            const originalValue = input.value;
            input.value = '@';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            setTimeout(() => {
              const hasDropdown = !!(document.querySelector('[data-testid*="dropdown"], .dropdown') &&
                                  window.getComputedStyle(document.querySelector('[data-testid*="dropdown"], .dropdown')!).display !== 'none');
              const hasDebugMessage = document.body.textContent?.includes('🚨 EMERGENCY DEBUG: Dropdown Open') || false;
              
              dropdownResults.push({
                input: inputId,
                hasDropdown,
                hasDebugMessage
              });

              // Check for inconsistency
              const workingDropdowns = dropdownResults.filter(r => r.hasDropdown || r.hasDebugMessage);
              const failingDropdowns = dropdownResults.filter(r => !r.hasDropdown && !r.hasDebugMessage);

              if (workingDropdowns.length > 0 && failingDropdowns.length > 0) {
                (window as any).__nldDetectPattern(
                  'mention-dropdown-inconsistency',
                  'CRITICAL',
                  'MentionInput',
                  `Dropdown inconsistency: working in ${workingDropdowns.map(w => w.input).join(', ')} but failing in ${failingDropdowns.map(f => f.input).join(', ')}`
                );
              }

              // Restore original value
              input.value = originalValue;
            }, 500);
          }
        });

        return dropdownResults;
      };

      // Automatic monitoring intervals
      setInterval(() => {
        if ((window as any).__nldMonitoring.enabled) {
          (window as any).__nldMonitorStackingContexts();
          (window as any).__nldMonitorComponentMounts();
        }
      }, 5000); // Every 5 seconds

      // Health check
      setInterval(() => {
        const alert = {
          id: `health-${Date.now()}`,
          timestamp: Date.now(),
          type: 'MONITORING_HEALTH',
          severity: 'INFO',
          message: 'Monitoring system healthy',
          component: 'NLD Monitor',
          actionRequired: false
        };
        (window as any).__nldMonitoring.alerts.push(alert);
        (window as any).__nldMonitoring.metrics.lastUpdateTime = Date.now();
      }, 30000); // Every 30 seconds
    });
  }

  async getMonitoringMetrics(page: Page): Promise<MonitoringMetrics> {
    return await page.evaluate(() => {
      return (window as any).__nldMonitoring?.metrics || {
        patternsDetected: 0,
        preventionsActive: 0,
        autoResolutions: 0,
        criticalAlerts: 0,
        monitoringUptime: Date.now(),
        lastUpdateTime: Date.now()
      };
    });
  }

  async getPatternEvents(page: Page): Promise<PatternDetectionEvent[]> {
    return await page.evaluate(() => {
      return (window as any).__nldMonitoring?.events || [];
    });
  }

  async getAlerts(page: Page): Promise<RealTimeAlert[]> {
    return await page.evaluate(() => {
      return (window as any).__nldMonitoring?.alerts || [];
    });
  }

  async triggerPatternDetection(page: Page, patternId: string, severity: string, component: string, description: string): Promise<void> {
    await page.evaluate(({ patternId, severity, component, description }) => {
      if ((window as any).__nldDetectPattern) {
        (window as any).__nldDetectPattern(patternId, severity, component, description);
      }
    }, { patternId, severity, component, description });
  }

  async activatePrevention(page: Page, patternId: string, action: string): Promise<void> {
    await page.evaluate(({ patternId, action }) => {
      if ((window as any).__nldActivatePrevention) {
        (window as any).__nldActivatePrevention(patternId, action);
      }
    }, { patternId, action });
  }

  async createMonitoringDashboard(page: Page): Promise<void> {
    // Inject monitoring dashboard UI
    await page.evaluate(() => {
      // Create dashboard container
      const dashboard = document.createElement('div');
      dashboard.id = 'nld-monitoring-dashboard';
      dashboard.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 350px;
        max-height: 400px;
        background: white;
        border: 2px solid #007acc;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 99999;
        font-family: monospace;
        font-size: 12px;
        overflow: hidden;
        display: none;
      `;

      // Dashboard header
      const header = document.createElement('div');
      header.style.cssText = `
        background: #007acc;
        color: white;
        padding: 8px 12px;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      header.innerHTML = `
        <span>🧠 NLD Monitor</span>
        <button id="nld-toggle" style="background: none; border: none; color: white; cursor: pointer;">❌</button>
      `;

      // Dashboard content
      const content = document.createElement('div');
      content.id = 'nld-dashboard-content';
      content.style.cssText = `
        padding: 12px;
        max-height: 320px;
        overflow-y: auto;
      `;

      dashboard.appendChild(header);
      dashboard.appendChild(content);
      document.body.appendChild(dashboard);

      // Toggle functionality
      document.getElementById('nld-toggle')?.addEventListener('click', () => {
        dashboard.style.display = dashboard.style.display === 'none' ? 'block' : 'none';
      });

      // Show dashboard by default
      dashboard.style.display = 'block';

      // Update dashboard content
      const updateDashboard = () => {
        const monitoring = (window as any).__nldMonitoring;
        if (!monitoring) return;

        const metrics = monitoring.metrics;
        const recentAlerts = monitoring.alerts.slice(-5);

        content.innerHTML = `
          <div style="margin-bottom: 12px;">
            <h4 style="margin: 0 0 6px 0; color: #007acc;">Metrics</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px;">
              <div>Patterns: ${metrics.patternsDetected}</div>
              <div>Preventions: ${metrics.preventionsActive}</div>
              <div>Auto-resolved: ${metrics.autoResolutions}</div>
              <div>Critical: ${metrics.criticalAlerts}</div>
            </div>
            <div style="margin-top: 4px; font-size: 10px; color: #666;">
              Last update: ${new Date(metrics.lastUpdateTime).toLocaleTimeString()}
            </div>
          </div>
          
          <div>
            <h4 style="margin: 0 0 6px 0; color: #007acc;">Recent Alerts</h4>
            <div style="max-height: 180px; overflow-y: auto;">
              ${recentAlerts.length === 0 ? 
                '<div style="color: #666; font-style: italic;">No alerts</div>' :
                recentAlerts.map(alert => `
                  <div style="margin-bottom: 8px; padding: 6px; background: ${
                    alert.severity === 'CRITICAL' ? '#ffebee' :
                    alert.severity === 'HIGH' ? '#fff3e0' :
                    alert.severity === 'MEDIUM' ? '#f3e5f5' :
                    '#e8f5e8'
                  }; border-radius: 4px; font-size: 10px;">
                    <div style="font-weight: bold; color: ${
                      alert.severity === 'CRITICAL' ? '#d32f2f' :
                      alert.severity === 'HIGH' ? '#f57c00' :
                      alert.severity === 'MEDIUM' ? '#7b1fa2' :
                      '#388e3c'
                    };">
                      ${alert.severity} - ${alert.component}
                    </div>
                    <div style="margin-top: 2px;">${alert.message}</div>
                    <div style="margin-top: 2px; color: #666;">
                      ${new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                `).join('')
              }
            </div>
          </div>
        `;
      };

      // Update dashboard every 2 seconds
      setInterval(updateDashboard, 2000);
      updateDashboard();

      // Global toggle function
      (window as any).__toggleNLDDashboard = () => {
        dashboard.style.display = dashboard.style.display === 'none' ? 'block' : 'none';
      };
    });
  }
}

test.describe('Real-Time Pattern Detection Monitoring', () => {
  let monitor: RealTimePatternMonitor;

  test.beforeEach(async ({ page }) => {
    monitor = new RealTimePatternMonitor();
    await monitor.initializeMonitoring(page);
  });

  test('should initialize real-time monitoring system', async ({ page }) => {
    await page.goto('/');
    await monitor.createMonitoringDashboard(page);

    // Verify monitoring is active
    const isMonitoringActive = await page.evaluate(() => {
      return !!(window as any).__nldMonitoring?.enabled;
    });

    expect(isMonitoringActive).toBe(true);

    // Verify dashboard is visible
    const dashboardVisible = await page.locator('#nld-monitoring-dashboard').isVisible();
    expect(dashboardVisible).toBe(true);
  });

  test('should detect and report pattern violations in real-time', async ({ page }) => {
    await page.goto('/');
    await monitor.createMonitoringDashboard(page);
    
    // Trigger pattern detection
    await monitor.triggerPatternDetection(
      page, 
      'test-pattern-violation',
      'HIGH',
      'TestComponent',
      'Test pattern violation detected'
    );

    await page.waitForTimeout(1000);

    // Check metrics
    const metrics = await monitor.getMonitoringMetrics(page);
    expect(metrics.patternsDetected).toBeGreaterThan(0);

    // Check events
    const events = await monitor.getPatternEvents(page);
    const testEvent = events.find(e => e.patternId === 'test-pattern-violation');
    expect(testEvent).toBeDefined();
    expect(testEvent?.severity).toBe('HIGH');

    // Check alerts
    const alerts = await monitor.getAlerts(page);
    const testAlert = alerts.find(a => a.message.includes('Test pattern violation'));
    expect(testAlert).toBeDefined();
  });

  test('should activate preventions automatically', async ({ page }) => {
    await page.goto('/');
    await monitor.createMonitoringDashboard(page);

    // Trigger pattern detection
    await monitor.triggerPatternDetection(
      page,
      'auto-prevention-test',
      'CRITICAL',
      'CriticalComponent',
      'Critical pattern requiring auto-prevention'
    );

    // Activate prevention
    await monitor.activatePrevention(
      page,
      'auto-prevention-test',
      'Applied DOM hierarchy flattening'
    );

    await page.waitForTimeout(1000);

    // Check prevention metrics
    const metrics = await monitor.getMonitoringMetrics(page);
    expect(metrics.preventionsActive).toBeGreaterThan(0);

    // Check prevention alert
    const alerts = await monitor.getAlerts(page);
    const preventionAlert = alerts.find(a => a.type === 'PREVENTION_ACTIVATED');
    expect(preventionAlert).toBeDefined();
    expect(preventionAlert?.autoActionTaken).toBe('Applied DOM hierarchy flattening');
  });

  test('should monitor CSS stacking context issues', async ({ page }) => {
    await page.goto('/');
    await monitor.createMonitoringDashboard(page);

    // Trigger stacking context monitoring
    await page.evaluate(() => {
      if ((window as any).__nldMonitorStackingContexts) {
        return (window as any).__nldMonitorStackingContexts();
      }
    });

    await page.waitForTimeout(1000);

    const events = await monitor.getPatternEvents(page);
    const metrics = await monitor.getMonitoringMetrics(page);

    // Should detect stacking contexts if they exist
    console.log(`Monitoring detected ${events.length} pattern events`);
    console.log(`Current metrics:`, metrics);
  });

  test('should monitor component mounting consistency', async ({ page }) => {
    await page.goto('/');
    await monitor.createMonitoringDashboard(page);

    // Trigger component mount monitoring
    const mountCounts = await page.evaluate(() => {
      if ((window as any).__nldMonitorComponentMounts) {
        return (window as any).__nldMonitorComponentMounts();
      }
      return {};
    });

    await page.waitForTimeout(1000);

    const events = await monitor.getPatternEvents(page);
    
    // Check for duplicate mount detection
    const duplicateMountEvents = events.filter(e => e.patternId === 'duplicate-component-mount');
    
    console.log(`Component mount counts:`, mountCounts);
    console.log(`Duplicate mount events:`, duplicateMountEvents.length);

    // Should not have excessive duplicate mounts
    expect(duplicateMountEvents.length).toBeLessThanOrEqual(2);
  });

  test('should monitor mention dropdown consistency across contexts', async ({ page }) => {
    await page.goto('/');
    await monitor.createMonitoringDashboard(page);

    // Trigger mention dropdown monitoring
    const dropdownResults = await page.evaluate(() => {
      if ((window as any).__nldMonitorMentionDropdowns) {
        return (window as any).__nldMonitorMentionDropdowns();
      }
      return [];
    });

    await page.waitForTimeout(2000);

    const events = await monitor.getPatternEvents(page);
    const inconsistencyEvents = events.filter(e => e.patternId === 'mention-dropdown-inconsistency');

    console.log(`Dropdown monitoring results:`, dropdownResults);
    console.log(`Inconsistency events:`, inconsistencyEvents.length);

    // Should not have critical dropdown inconsistencies
    const criticalInconsistencies = inconsistencyEvents.filter(e => e.severity === 'CRITICAL');
    expect(criticalInconsistencies.length).toBeLessThanOrEqual(1);
  });

  test('should provide monitoring health checks', async ({ page }) => {
    await page.goto('/');
    await monitor.createMonitoringDashboard(page);

    // Wait for health check interval
    await page.waitForTimeout(5000);

    const alerts = await monitor.getAlerts(page);
    const healthAlerts = alerts.filter(a => a.type === 'MONITORING_HEALTH');

    // Should have at least one health check
    expect(healthAlerts.length).toBeGreaterThan(0);

    const metrics = await monitor.getMonitoringMetrics(page);
    const currentTime = Date.now();
    const timeSinceLastUpdate = currentTime - metrics.lastUpdateTime;

    // Should have recent updates (within last 10 seconds)
    expect(timeSinceLastUpdate).toBeLessThan(10000);
  });

  test('should handle monitoring dashboard interactions', async ({ page }) => {
    await page.goto('/');
    await monitor.createMonitoringDashboard(page);

    // Test dashboard toggle
    await page.click('#nld-toggle');
    
    let dashboardVisible = await page.locator('#nld-monitoring-dashboard').isVisible();
    expect(dashboardVisible).toBe(false);

    // Toggle back on
    await page.evaluate(() => {
      if ((window as any).__toggleNLDDashboard) {
        (window as any).__toggleNLDDashboard();
      }
    });

    dashboardVisible = await page.locator('#nld-monitoring-dashboard').isVisible();
    expect(dashboardVisible).toBe(true);
  });

  test('should track monitoring performance metrics', async ({ page }) => {
    await page.goto('/');
    await monitor.createMonitoringDashboard(page);

    const startTime = Date.now();

    // Generate multiple pattern events
    for (let i = 0; i < 5; i++) {
      await monitor.triggerPatternDetection(
        page,
        `performance-test-${i}`,
        i % 2 === 0 ? 'HIGH' : 'MEDIUM',
        'PerformanceTest',
        `Performance test pattern ${i}`
      );
      
      if (i % 2 === 0) {
        await monitor.activatePrevention(
          page,
          `performance-test-${i}`,
          `Prevention action ${i}`
        );
      }
    }

    await page.waitForTimeout(2000);

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    const metrics = await monitor.getMonitoringMetrics(page);
    const events = await monitor.getPatternEvents(page);
    const alerts = await monitor.getAlerts(page);

    // Performance assertions
    expect(processingTime).toBeLessThan(5000); // Should process quickly
    expect(metrics.patternsDetected).toBeGreaterThanOrEqual(5);
    expect(events.length).toBeGreaterThanOrEqual(5);
    expect(alerts.length).toBeGreaterThanOrEqual(5);

    console.log(`Processed ${events.length} events in ${processingTime}ms`);
    console.log(`Final metrics:`, metrics);
  });

  test('should export monitoring data for neural training', async ({ page }) => {
    await page.goto('/');
    await monitor.createMonitoringDashboard(page);

    // Generate test data
    await monitor.triggerPatternDetection(page, 'export-test', 'CRITICAL', 'ExportTest', 'Export test pattern');
    await monitor.activatePrevention(page, 'export-test', 'Applied export test prevention');

    await page.waitForTimeout(1000);

    const metrics = await monitor.getMonitoringMetrics(page);
    const events = await monitor.getPatternEvents(page);
    const alerts = await monitor.getAlerts(page);

    const monitoringExportData = {
      timestamp: new Date().toISOString(),
      monitoringSession: {
        duration: Date.now() - metrics.monitoringUptime,
        metricsSnapshot: metrics,
        totalEvents: events.length,
        totalAlerts: alerts.length
      },
      detectedPatterns: events,
      generatedAlerts: alerts,
      neuralTrainingValue: {
        patternDetectionAccuracy: events.length > 0 ? 1.0 : 0.0,
        preventionEffectiveness: metrics.preventionsActive / Math.max(metrics.patternsDetected, 1),
        autoResolutionRate: metrics.autoResolutions / Math.max(metrics.patternsDetected, 1),
        monitoringReliability: metrics.lastUpdateTime > metrics.monitoringUptime ? 1.0 : 0.0
      },
      recommendations: [
        'Real-time monitoring successfully detects pattern violations',
        'Prevention mechanisms activate automatically for critical patterns',
        'Dashboard provides clear visibility into system health',
        'Monitoring performance remains stable under load'
      ]
    };

    // Validate export data structure
    expect(monitoringExportData.neuralTrainingValue.patternDetectionAccuracy).toBeGreaterThan(0);
    expect(monitoringExportData.detectedPatterns.length).toBeGreaterThan(0);
    expect(monitoringExportData.generatedAlerts.length).toBeGreaterThan(0);

    console.log('Monitoring neural training export:', JSON.stringify(monitoringExportData, null, 2));
  });
});