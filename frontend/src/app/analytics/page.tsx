'use client';

import React from 'react';
import { EnhancedAnalyticsPage } from '@/components/analytics';
import AnalyticsErrorBoundary from '@/components/analytics/AnalyticsErrorBoundary';

const AnalyticsPage: React.FC = () => {
  return (
    <AnalyticsErrorBoundary>
      <EnhancedAnalyticsPage
        enableRealTime={true}
        refreshInterval={30000}
      />
    </AnalyticsErrorBoundary>
  );
};

export default AnalyticsPage;