import React from 'react';
import { AnalyticsProvider } from './AnalyticsProvider';
import AnalyticsErrorBoundary from './AnalyticsErrorBoundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportData, CostOptimization } from '../types/analytics';
import { cn } from '@/lib/utils';

// Regular imports for immediate availability (no nested lazy loading)
import CostOverviewDashboard from './CostOverviewDashboard';
import MessageStepAnalytics from './MessageStepAnalytics';
import OptimizationRecommendations from './OptimizationRecommendations';
import ExportReportingFeatures from './ExportReportingFeatures';

interface EnhancedAnalyticsPageProps {
  className?: string;
  enableRealTime?: boolean;
  refreshInterval?: number;
}

const EnhancedAnalyticsPage: React.FC<EnhancedAnalyticsPageProps> = ({
  className,
  enableRealTime = true,
  refreshInterval = 30000
}) => {
  const handleExport = (format: string, data: ExportData) => {
    console.log(`Exporting ${format} format:`, data);
    // In a real implementation, this would trigger the actual export
  };

  const handleImplementOptimization = (optimization: CostOptimization) => {
    console.log('Implementing optimization:', optimization);
    // In a real implementation, this would trigger optimization implementation
  };

  const handleTimeRangeChange = (range: string) => {
    console.log('Time range changed:', range);
  };

  return (
    <AnalyticsProvider
      enableRealTime={enableRealTime}
      refreshInterval={refreshInterval}
    >
      <AnalyticsErrorBoundary>
        <div className={cn('min-h-screen bg-gray-50 p-6', className)}>
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Claude Code SDK Analytics
              </h1>
              <p className="text-lg text-gray-600">
                Comprehensive cost tracking, usage analytics, and performance insights
              </p>
            </div>

            {/* Analytics Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
                <TabsTrigger value="overview" className="text-sm">
                  Cost Overview
                </TabsTrigger>
                <TabsTrigger value="messages" className="text-sm">
                  Messages & Steps
                </TabsTrigger>
                <TabsTrigger value="optimize" className="text-sm">
                  Optimization
                </TabsTrigger>
                <TabsTrigger value="export" className="text-sm">
                  Export & Reports
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <AnalyticsErrorBoundary enableNLDIntegration={false}>
                  <CostOverviewDashboard
                    onTimeRangeChange={handleTimeRangeChange}
                    onExport={() => handleExport('pdf', {} as ExportData)}
                    realTimeUpdates={enableRealTime}
                  />
                </AnalyticsErrorBoundary>
              </TabsContent>

              <TabsContent value="messages" className="space-y-6">
                <AnalyticsErrorBoundary enableNLDIntegration={false}>
                  <MessageStepAnalytics
                    realTimeUpdates={enableRealTime}
                  />
                </AnalyticsErrorBoundary>
              </TabsContent>

              <TabsContent value="optimize" className="space-y-6">
                <AnalyticsErrorBoundary enableNLDIntegration={false}>
                  <OptimizationRecommendations
                    onImplement={handleImplementOptimization}
                  />
                </AnalyticsErrorBoundary>
              </TabsContent>

              <TabsContent value="export" className="space-y-6">
                <AnalyticsErrorBoundary enableNLDIntegration={false}>
                  <ExportReportingFeatures
                    onExport={handleExport}
                  />
                </AnalyticsErrorBoundary>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </AnalyticsErrorBoundary>
    </AnalyticsProvider>
  );
};

export default EnhancedAnalyticsPage;

// Export for dynamic import usage
export { EnhancedAnalyticsPage };

// Legacy compatibility export
export const AnalyticsPage = EnhancedAnalyticsPage;
