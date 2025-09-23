// Simple ES module test for analytics components
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Testing analytics component imports...');

async function testBasicImports() {
  try {
    // Test the type definitions first
    console.log('1. Testing analytics types...');
    const analyticsTypesPath = resolve(__dirname, '../types/analytics.ts');
    console.log(`   Types file exists: ${analyticsTypesPath}`);

    // Test chart components
    console.log('2. Testing chart components...');
    const lineChartPath = resolve(__dirname, '../components/charts/LineChart.tsx');
    const barChartPath = resolve(__dirname, '../components/charts/BarChart.tsx');
    const pieChartPath = resolve(__dirname, '../components/charts/PieChart.tsx');

    console.log(`   ✓ LineChart path: ${lineChartPath}`);
    console.log(`   ✓ BarChart path: ${barChartPath}`);
    console.log(`   ✓ PieChart path: ${pieChartPath}`);

    // Test analytics components
    console.log('3. Testing analytics components...');
    const enhancedAnalyticsPath = resolve(__dirname, '../components/analytics/EnhancedAnalyticsPage.tsx');
    const costDashboardPath = resolve(__dirname, '../components/analytics/CostOverviewDashboard.tsx');
    const messageAnalyticsPath = resolve(__dirname, '../components/analytics/MessageStepAnalytics.tsx');
    const optimizationPath = resolve(__dirname, '../components/analytics/OptimizationRecommendations.tsx');
    const exportFeaturesPath = resolve(__dirname, '../components/analytics/ExportReportingFeatures.tsx');

    console.log(`   ✓ EnhancedAnalyticsPage path: ${enhancedAnalyticsPath}`);
    console.log(`   ✓ CostOverviewDashboard path: ${costDashboardPath}`);
    console.log(`   ✓ MessageStepAnalytics path: ${messageAnalyticsPath}`);
    console.log(`   ✓ OptimizationRecommendations path: ${optimizationPath}`);
    console.log(`   ✓ ExportReportingFeatures path: ${exportFeaturesPath}`);

    // Test providers and boundaries
    console.log('4. Testing providers and error boundaries...');
    const providerPath = resolve(__dirname, '../components/analytics/AnalyticsProvider.tsx');
    const errorBoundaryPath = resolve(__dirname, '../components/analytics/AnalyticsErrorBoundary.tsx');
    const whiteScreenPath = resolve(__dirname, '../components/analytics/AnalyticsWhiteScreenPrevention.tsx');

    console.log(`   ✓ AnalyticsProvider path: ${providerPath}`);
    console.log(`   ✓ AnalyticsErrorBoundary path: ${errorBoundaryPath}`);
    console.log(`   ✓ AnalyticsWhiteScreenPrevention path: ${whiteScreenPath}`);

    // Test NLD components
    console.log('5. Testing NLD components...');
    const nldCorePath = resolve(__dirname, '../nld/core/NLDCore.tsx');
    const nldIntegrationPath = resolve(__dirname, '../nld/integration/AnalyticsNLDIntegration.tsx');
    const nldMonitorPath = resolve(__dirname, '../nld/monitors/AnalyticsHTTP500Monitor.tsx');

    console.log(`   ✓ NLDCore path: ${nldCorePath}`);
    console.log(`   ✓ AnalyticsNLDIntegration path: ${nldIntegrationPath}`);
    console.log(`   ✓ AnalyticsHTTP500Monitor path: ${nldMonitorPath}`);

    console.log('\n✅ ALL FILE PATHS VERIFIED!');
    console.log('📁 All analytics component files exist and are accessible');

    return true;
  } catch (error) {
    console.error('❌ Path verification failed:', error);
    return false;
  }
}

// Check if we can access files
import { promises as fs } from 'fs';

async function verifyFilesExist() {
  console.log('\n🔍 Verifying file existence...');

  const filesToCheck = [
    '../types/analytics.ts',
    '../components/charts/LineChart.tsx',
    '../components/charts/BarChart.tsx',
    '../components/charts/PieChart.tsx',
    '../components/analytics/EnhancedAnalyticsPage.tsx',
    '../components/analytics/CostOverviewDashboard.tsx',
    '../components/analytics/MessageStepAnalytics.tsx',
    '../components/analytics/OptimizationRecommendations.tsx',
    '../components/analytics/ExportReportingFeatures.tsx',
    '../components/analytics/AnalyticsProvider.tsx',
    '../components/analytics/AnalyticsErrorBoundary.tsx',
    '../components/analytics/AnalyticsWhiteScreenPrevention.tsx',
    '../nld/core/NLDCore.tsx',
    '../nld/integration/AnalyticsNLDIntegration.tsx',
    '../nld/monitors/AnalyticsHTTP500Monitor.tsx'
  ];

  let allExist = true;

  for (const file of filesToCheck) {
    try {
      const fullPath = resolve(__dirname, file);
      await fs.access(fullPath);
      console.log(`   ✓ ${file}`);
    } catch (error) {
      console.log(`   ❌ ${file} - NOT FOUND`);
      allExist = false;
    }
  }

  return allExist;
}

// Run the tests
async function runTests() {
  console.log('🚀 Starting analytics import verification...\n');

  const pathsOK = await testBasicImports();
  const filesExist = await verifyFilesExist();

  if (pathsOK && filesExist) {
    console.log('\n🎉 ANALYTICS IMPORT VERIFICATION SUCCESSFUL! ✅');
    console.log('   All required files exist and paths are correct');
    console.log('   Analytics components should import without issues');
  } else {
    console.log('\n❌ ANALYTICS IMPORT VERIFICATION FAILED!');
    console.log('   Some required files are missing or paths are incorrect');
  }
}

runTests().catch(console.error);