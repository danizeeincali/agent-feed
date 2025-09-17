// Simple import test to debug the loading issue
async function testImports() {
  try {
    console.log('Testing EnhancedAnalyticsPage import...');

    // Test dynamic import
    const component = await import('../components/analytics/EnhancedAnalyticsPage.tsx');
    console.log('✅ EnhancedAnalyticsPage imported successfully');
    console.log('Exports:', Object.keys(component));

    // Test sub-component imports
    console.log('\nTesting sub-components...');

    const provider = await import('../components/analytics/AnalyticsProvider.tsx');
    console.log('✅ AnalyticsProvider imported');

    const errorBoundary = await import('../components/analytics/AnalyticsErrorBoundary.tsx');
    console.log('✅ AnalyticsErrorBoundary imported');

    const costDashboard = await import('../components/analytics/CostOverviewDashboard.tsx');
    console.log('✅ CostOverviewDashboard imported');

    const messageAnalytics = await import('../components/analytics/MessageStepAnalytics.tsx');
    console.log('✅ MessageStepAnalytics imported');

    console.log('\n✅ All components can be imported successfully!');

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testImports();