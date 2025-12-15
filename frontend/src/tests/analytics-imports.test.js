// Test file to verify analytics component imports work correctly
console.log('Testing analytics component imports...');

async function testImports() {
  try {
    // Test core analytics components
    console.log('1. Testing RealAnalytics...');
    const RealAnalytics = await import('../components/RealAnalytics.tsx');
    console.log('✓ RealAnalytics imported successfully');

    // Test enhanced analytics page (this is the main lazy-loaded component)
    console.log('2. Testing EnhancedAnalyticsPage...');
    const EnhancedAnalyticsPage = await import('../components/analytics/EnhancedAnalyticsPage.tsx');
    console.log('✓ EnhancedAnalyticsPage imported successfully');

    // Test individual analytics components
    console.log('3. Testing CostOverviewDashboard...');
    const CostOverviewDashboard = await import('../components/analytics/CostOverviewDashboard.tsx');
    console.log('✓ CostOverviewDashboard imported successfully');

    console.log('4. Testing MessageStepAnalytics...');
    const MessageStepAnalytics = await import('../components/analytics/MessageStepAnalytics.tsx');
    console.log('✓ MessageStepAnalytics imported successfully');

    console.log('5. Testing OptimizationRecommendations...');
    const OptimizationRecommendations = await import('../components/analytics/OptimizationRecommendations.tsx');
    console.log('✓ OptimizationRecommendations imported successfully');

    console.log('6. Testing ExportReportingFeatures...');
    const ExportReportingFeatures = await import('../components/analytics/ExportReportingFeatures.tsx');
    console.log('✓ ExportReportingFeatures imported successfully');

    // Test chart components
    console.log('7. Testing LineChart...');
    const LineChart = await import('../components/charts/LineChart.tsx');
    console.log('✓ LineChart imported successfully');

    console.log('8. Testing BarChart...');
    const BarChart = await import('../components/charts/BarChart.tsx');
    console.log('✓ BarChart imported successfully');

    console.log('9. Testing PieChart...');
    const PieChart = await import('../components/charts/PieChart.tsx');
    console.log('✓ PieChart imported successfully');

    // Test providers and error boundaries
    console.log('10. Testing AnalyticsProvider...');
    const AnalyticsProvider = await import('../components/analytics/AnalyticsProvider.tsx');
    console.log('✓ AnalyticsProvider imported successfully');

    console.log('11. Testing AnalyticsErrorBoundary...');
    const AnalyticsErrorBoundary = await import('../components/analytics/AnalyticsErrorBoundary.tsx');
    console.log('✓ AnalyticsErrorBoundary imported successfully');

    // Test white screen prevention
    console.log('12. Testing AnalyticsWhiteScreenPrevention...');
    const AnalyticsWhiteScreenPrevention = await import('../components/analytics/AnalyticsWhiteScreenPrevention.tsx');
    console.log('✓ AnalyticsWhiteScreenPrevention imported successfully');

    // Test NLD components
    console.log('13. Testing NLDOrchestrator...');
    const NLDOrchestrator = await import('../nld/core/NLDOrchestrator.tsx');
    console.log('✓ NLDOrchestrator imported successfully');

    console.log('14. Testing AnalyticsNLDIntegration...');
    const AnalyticsNLDIntegration = await import('../nld/integration/AnalyticsNLDIntegration.tsx');
    console.log('✓ AnalyticsNLDIntegration imported successfully');

    // Test analytics types
    console.log('15. Testing analytics types...');
    const analyticsTypes = await import('../types/analytics.ts');
    console.log('✓ Analytics types imported successfully');

    console.log('\n🎉 ALL ANALYTICS IMPORTS SUCCESSFUL! ✅');
    console.log('Analytics components are ready for use.');

    // Verify exports exist
    console.log('\n🔍 Verifying component exports...');

    if (RealAnalytics.default) console.log('✓ RealAnalytics has default export');
    if (EnhancedAnalyticsPage.default) console.log('✓ EnhancedAnalyticsPage has default export');
    if (EnhancedAnalyticsPage.EnhancedAnalyticsPage) console.log('✓ EnhancedAnalyticsPage has named export');
    if (EnhancedAnalyticsPage.AnalyticsPage) console.log('✓ AnalyticsPage alias exists');

    if (CostOverviewDashboard.default) console.log('✓ CostOverviewDashboard has default export');
    if (MessageStepAnalytics.default) console.log('✓ MessageStepAnalytics has default export');
    if (OptimizationRecommendations.default) console.log('✓ OptimizationRecommendations has default export');
    if (ExportReportingFeatures.default) console.log('✓ ExportReportingFeatures has default export');

    if (LineChart.default) console.log('✓ LineChart has default export');
    if (BarChart.default) console.log('✓ BarChart has default export');
    if (PieChart.default) console.log('✓ PieChart has default export');

    if (AnalyticsProvider.AnalyticsProvider) console.log('✓ AnalyticsProvider has named export');
    if (AnalyticsErrorBoundary.default) console.log('✓ AnalyticsErrorBoundary has default export');
    if (AnalyticsWhiteScreenPrevention.AnalyticsWhiteScreenPrevention) console.log('✓ AnalyticsWhiteScreenPrevention has named export');

    if (NLDOrchestrator.NLDOrchestrator) console.log('✓ NLDOrchestrator has named export');
    if (AnalyticsNLDIntegration.AnalyticsNLDIntegration) console.log('✓ AnalyticsNLDIntegration has named export');

    return true;

  } catch (error) {
    console.error('❌ Import test failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    return false;
  }
}

// Run the test
testImports().then(success => {
  if (success) {
    console.log('\n✅ Analytics import verification PASSED');
  } else {
    console.log('\n❌ Analytics import verification FAILED');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Unexpected error during import test:', error);
  process.exit(1);
});